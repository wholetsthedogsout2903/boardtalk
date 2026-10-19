import type { RecordingRepository } from '../shared/storage/RecordingRepository';
import type {
  Diagnosis,
  KeyMoment,
  ReviewResult,
  Stage,
  TranscriptSegment,
} from '../shared/types';
import type { KeyMomentFinder } from './KeyMomentFinder';
import type { MoveAligner } from './MoveAligner';
import type { PositionBuilder } from './PositionBuilder';
import type { PositionEvaluator } from './PositionEvaluator';

export interface Transcriber {
  transcribe(audio: Blob): Promise<TranscriptSegment[]>;
}

export interface Diagnoser {
  diagnose(moments: KeyMoment[]): Promise<Diagnosis>;
}

export type OnProgress = (stage: Stage, done: number, total: number) => void;

/**
 * Stages: transcribe || evaluate -> align -> key moments -> diagnose.
 * Skips stages already cached in recording.analysis; opts.redo forces one.
 * Skips the LLM call when there are no key moments.
 */
export class AnalysisPipeline {
  constructor(
    private readonly repo: RecordingRepository,
    private readonly transcriber: Transcriber,
    private readonly positions: PositionBuilder,
    private readonly evaluator: PositionEvaluator,
    private readonly aligner: MoveAligner,
    private readonly finder: KeyMomentFinder,
    private readonly diagnoser: Diagnoser,
  ) {}

  run(_id: string, _onProgress: OnProgress, _opts?: { redo?: 'diagnosis' }): Promise<ReviewResult> {
    throw new Error('Not implemented');
  }
}
