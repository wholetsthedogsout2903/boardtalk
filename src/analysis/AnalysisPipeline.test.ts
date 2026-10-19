import { describe, expect, it, vi } from 'vitest';
import type { Diagnosis, KeyMoment, Position, Recording } from '../shared/types';
import { SEGMENTS, evalsFor, gameMoves, positions, recording } from '../test/fixtures';
import { AnalysisPipeline } from './AnalysisPipeline';
import type { ProgressEvent } from './AnalysisPipeline';
import { AnalysisError } from './errors';
import { KeyMomentFinder } from './KeyMomentFinder';
import { MoveAligner } from './MoveAligner';
import { PositionBuilder } from './PositionBuilder';

function setup(rec: Recording = recording(), opts: { evals?: ReturnType<typeof evalsFor> } = {}) {
  const stored: Recording = structuredClone(rec);
  const repo = {
    get: vi.fn(async () => structuredClone(stored)),
    getAudio: vi.fn(async () => new Blob(['a'])),
    saveStage: vi.fn(async (_id: string, stage: string, data: unknown) => {
      (stored.analysis as Record<string, unknown>)[stage] = data;
    }),
  };
  const transcriber = { transcribe: vi.fn(async () => SEGMENTS) };
  const evaluator = {
    evaluateAll: vi.fn(async (_p: Position[], _cb: (done: number, total: number) => void) => opts.evals ?? evalsFor(positions())),
  };
  const diagnoser = {
    diagnose: vi.fn(async (moments: KeyMoment[]): Promise<Diagnosis> => ({
      moments: moments.map((m) => ({
        ply: m.ply,
        label: m.speech === null ? 'no_structure' : 'no_plan',
        imbalance: null,
        diagnosis: `diag ${m.ply}`,
        quote: null,
      })),
      summary: 'You move fast.',
      habit: 'Name a plan.',
      warnings: ['w1'],
    })),
  };
  const pipeline = new AnalysisPipeline(
    repo as never,
    transcriber,
    new PositionBuilder(),
    evaluator,
    new MoveAligner(),
    new KeyMomentFinder(),
    diagnoser,
  );
  const events: ProgressEvent[] = [];
  return { pipeline, repo, transcriber, evaluator, diagnoser, events, onProgress: (e: ProgressEvent) => events.push(e) };
}

describe('AnalysisPipeline', () => {
  it('produces the review: silence stats, merged key moments, warnings', async () => {
    const s = setup();
    const r = await s.pipeline.run('rec1', s.onProgress);
    expect(r.userMoveCount).toBe(5);
    expect(r.silentCount).toBe(1); // ply 9
    expect(r.summary).toBe('You move fast.');
    expect(r.habit).toBe('Name a plan.');
    expect(r.warnings).toEqual(['w1']);
    expect(r.moments.map((m) => [m.ply, m.playedSan, m.label, m.diagnosis])).toEqual([
      [3, 'Nf3', 'no_plan', 'diag 3'],
      [9, 'O-O', 'no_structure', 'diag 9'],
    ]);
    const done = s.events.filter((e) => e.status === 'done').map((e) => e.stage).sort();
    expect(done).toEqual(['diagnose', 'evaluate', 'transcribe']);
  });

  it('caches stages and only redoes the diagnosis when asked', async () => {
    const s = setup();
    await s.pipeline.run('rec1', s.onProgress);
    await s.pipeline.run('rec1', s.onProgress);
    expect(s.transcriber.transcribe).toHaveBeenCalledTimes(1);
    expect(s.evaluator.evaluateAll).toHaveBeenCalledTimes(1);
    expect(s.diagnoser.diagnose).toHaveBeenCalledTimes(1);
    await s.pipeline.run('rec1', s.onProgress, { redo: 'diagnosis' });
    expect(s.diagnoser.diagnose).toHaveBeenCalledTimes(2);
    expect(s.transcriber.transcribe).toHaveBeenCalledTimes(1);
    expect(s.events.some((e) => e.status === 'cached')).toBe(true);
  });

  it('keeps finished stages when another stage fails', async () => {
    const s = setup();
    s.transcriber.transcribe.mockRejectedValueOnce(new AnalysisError('transcribe', 'auth', 'bad key'));
    await expect(s.pipeline.run('rec1', s.onProgress)).rejects.toMatchObject({ kind: 'auth', stage: 'transcribe' });
    expect(s.repo.saveStage).toHaveBeenCalledWith('rec1', 'evals', expect.anything());
    expect(s.events).toContainEqual({ stage: 'transcribe', status: 'failed' });
    // retry resumes: evals come from cache
    await s.pipeline.run('rec1', s.onProgress);
    expect(s.evaluator.evaluateAll).toHaveBeenCalledTimes(1);
  });

  it('wraps unexpected errors as AnalysisError', async () => {
    const s = setup();
    s.evaluator.evaluateAll.mockRejectedValueOnce(new Error('boom'));
    await expect(s.pipeline.run('rec1', s.onProgress)).rejects.toMatchObject({ kind: 'engine', stage: 'evaluate' });
  });

  it('skips the LLM when there are no key moments', async () => {
    const s = setup(recording(), { evals: evalsFor(positions(), Array(10).fill(0) as number[]) });
    const r = await s.pipeline.run('rec1', s.onProgress);
    expect(s.diagnoser.diagnose).not.toHaveBeenCalled();
    expect(s.events).toContainEqual({ stage: 'diagnose', status: 'skipped' });
    expect(r.moments).toEqual([]);
    expect(r.summary).toBeNull();
    expect(r.userMoveCount).toBe(5);
  });

  it('evaluates only from just before the first timed user move after a mid-game join', async () => {
    const s = setup(recording({ moves: gameMoves(4) })); // plies 1-4 already on board
    await s.pipeline.run('rec1', s.onProgress);
    const subset = s.evaluator.evaluateAll.mock.calls[0]![0];
    expect(subset[0]!.ply).toBe(4);
    expect(subset.at(-1)!.ply).toBe(9);
  });

  it('stops at an illegal move with a warning', async () => {
    const moves = gameMoves();
    moves[5] = { ...moves[5]!, san: 'Ke5' }; // ply 6 is illegal
    const s = setup(recording({ moves }));
    const r = await s.pipeline.run('rec1', s.onProgress);
    expect(r.warnings.some((w) => w.includes('ply 6'))).toBe(true);
    expect(r.userMoveCount).toBe(3); // plies 1, 3, 5
  });

  it('returns an empty review when no user moves were captured', async () => {
    const s = setup(recording({ moves: gameMoves(9) }));
    const r = await s.pipeline.run('rec1', s.onProgress);
    expect(r.userMoveCount).toBe(0);
    expect(r.warnings.join(' ')).toMatch(/No moves of yours/);
    expect(s.transcriber.transcribe).not.toHaveBeenCalled();
  });

  it('reports a missing recording', async () => {
    const s = setup();
    s.repo.get.mockResolvedValueOnce(null as never);
    await expect(s.pipeline.run('x', s.onProgress)).rejects.toThrow(/not found/);
  });
});
