import type { RecordingRepository } from '../shared/storage/RecordingRepository';
import type {
  AlignedMove,
  Color,
  Diagnosis,
  KeyMoment,
  ReviewResult,
  Stage,
  TranscriptSegment,
} from '../shared/types';
import { KEY_MOMENTS } from './config';
import { AnalysisError } from './errors';
import { isUserPly } from './MoveAligner';
import type { KeyMomentFinder } from './KeyMomentFinder';
import type { MoveAligner } from './MoveAligner';
import type { PositionBuilder } from './PositionBuilder';
import type { PositionEvaluator } from './PositionEvaluator';
import { dropNonSpeech } from './speech';

export interface Transcriber {
  transcribe(audio: Blob): Promise<TranscriptSegment[]>;
}

export interface Diagnoser {
  diagnose(moments: KeyMoment[], color: Color): Promise<Diagnosis>;
}

export type StageStatus = 'running' | 'done' | 'cached' | 'skipped' | 'failed';
export interface ProgressEvent {
  stage: Stage;
  status: StageStatus;
  done?: number;
  total?: number;
}
export type OnProgress = (e: ProgressEvent) => void;

type Repo = Pick<RecordingRepository, 'get' | 'getAudio' | 'saveStage'>;

function toAnalysisError(stage: Stage, err: unknown): AnalysisError {
  if (err instanceof AnalysisError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new AnalysisError(stage, stage === 'evaluate' ? 'engine' : 'network', message);
}

/**
 * Stages: transcribe || evaluate -> align -> key moments -> diagnose.
 * Each expensive stage is cached per recording; opts.redo forces the diagnosis.
 * Skips the LLM call when there are no key moments.
 */
export class AnalysisPipeline {
  constructor(
    private readonly repo: Repo,
    private readonly transcriber: Transcriber,
    private readonly builder: Pick<PositionBuilder, 'build'>,
    private readonly evaluator: Pick<PositionEvaluator, 'evaluateAll'>,
    private readonly aligner: Pick<MoveAligner, 'align'>,
    private readonly finder: Pick<KeyMomentFinder, 'find'>,
    private readonly diagnoser: Diagnoser,
  ) {}

  async run(
    id: string,
    onProgress: OnProgress,
    opts: { redo?: 'diagnosis' } = {},
  ): Promise<ReviewResult> {
    const rec = await this.repo.get(id);
    if (!rec) throw new Error('Recording not found');

    const built = this.builder.build(rec.moves.map((m) => m.san));
    const warnings: string[] = [];
    if (built.illegalAtPly !== null) {
      warnings.push(
        `Replay stopped at ply ${built.illegalAtPly}: that move was not legal in the reconstructed position, so later moves were ignored.`,
      );
    }
    if (built.positions.length < 2) {
      if (rec.moves.length === 0) return this.emptyResult(onProgress, warnings, 'No moves were captured.');
      throw new AnalysisError(
        'evaluate',
        'unsupported',
        "This game couldn't be replayed (variants and Chess960 aren't supported).",
      );
    }

    const usable = rec.moves.filter((m) => m.ply < built.positions.length);
    const timedUser = usable.filter((m) => isUserPly(m.ply, rec.userColor) && m.observedAt !== null);
    if (timedUser.length === 0) {
      return this.emptyResult(onProgress, warnings, 'No moves of yours were captured while recording.');
    }

    const fromPly = timedUser[0]!.ply - 1; // skip positions before the user joined
    const subset = built.positions.filter((p) => p.ply >= fromPly);

    const [tr, ev] = await Promise.allSettled([
      this.stage('transcribe', rec.analysis.transcript, false, onProgress, async () => {
        const audio = await this.repo.getAudio(id);
        return this.transcriber.transcribe(audio);
      }, (v) => this.repo.saveStage(id, 'transcript', v)),
      this.stage('evaluate', rec.analysis.evals, false, onProgress, () =>
        this.evaluator.evaluateAll(subset, (done, total) =>
          onProgress({ stage: 'evaluate', status: 'running', done, total }),
        ), (v) => this.repo.saveStage(id, 'evals', v)),
    ]);
    if (tr.status === 'rejected') throw tr.reason;
    if (ev.status === 'rejected') throw ev.reason;

    const aligned = this.aligner.align(
      { moves: usable, userColor: rec.userColor, startedAt: rec.startedAt },
      dropNonSpeech(tr.value),
    );
    const moments = this.finder.find(rec.userColor, built.positions, aligned, ev.value, KEY_MOMENTS);

    let diagnosis: Diagnosis | null = null;
    if (moments.length === 0) {
      onProgress({ stage: 'diagnose', status: 'skipped' });
    } else {
      diagnosis = await this.stage(
        'diagnose',
        rec.analysis.diagnosis,
        opts.redo === 'diagnosis',
        onProgress,
        () => this.diagnoser.diagnose(moments, rec.userColor),
        (v) => this.repo.saveStage(id, 'diagnosis', v),
      );
    }
    return buildReview(aligned, moments, diagnosis, warnings);
  }

  private emptyResult(onProgress: OnProgress, warnings: string[], note: string): ReviewResult {
    (['transcribe', 'evaluate', 'diagnose'] as const).forEach((stage) =>
      onProgress({ stage, status: 'skipped' }),
    );
    return { userMoveCount: 0, silentCount: 0, summary: null, habit: null, moments: [], warnings: [...warnings, note] };
  }

  private async stage<T>(
    stage: Stage,
    cached: T | undefined,
    force: boolean,
    onProgress: OnProgress,
    work: () => Promise<T>,
    persist: (v: T) => Promise<void>,
  ): Promise<T> {
    if (cached !== undefined && !force) {
      onProgress({ stage, status: 'cached' });
      return cached;
    }
    onProgress({ stage, status: 'running' });
    try {
      const value = await work();
      await persist(value);
      onProgress({ stage, status: 'done' });
      return value;
    } catch (err) {
      onProgress({ stage, status: 'failed' });
      throw toAnalysisError(stage, err);
    }
  }
}

export function buildReview(
  aligned: AlignedMove[],
  moments: KeyMoment[],
  diagnosis: Diagnosis | null,
  warnings: string[],
): ReviewResult {
  const timedUser = aligned.filter((m) => m.isUser && m.observedAt !== null);
  const byPly = new Map(diagnosis?.moments.map((d) => [d.ply, d]));
  return {
    userMoveCount: timedUser.length,
    silentCount: timedUser.filter((m) => m.speech === null).length,
    summary: diagnosis?.summary ?? null,
    habit: diagnosis?.habit ?? null,
    moments: moments.flatMap((m) => {
      const d = byPly.get(m.ply);
      return d ? [{ ...m, ...d }] : [];
    }),
    warnings: [...warnings, ...(diagnosis?.warnings ?? [])],
  };
}
