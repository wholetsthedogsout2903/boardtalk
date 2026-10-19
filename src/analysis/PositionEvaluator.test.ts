import { describe, expect, it, vi } from 'vitest';
import { PositionBuilder } from './PositionBuilder';
import { PositionEvaluator } from './PositionEvaluator';

function fakeEngine(script: Array<{ cp?: number; mate?: number; bestUci: string | null }>) {
  let i = 0;
  return {
    init: vi.fn(async () => {}),
    analyse: vi.fn(async () => script[i++]!),
    dispose: vi.fn(),
  };
}

describe('PositionEvaluator', () => {
  it('converts side-to-move scores to white POV and reports progress', async () => {
    const { positions } = new PositionBuilder().build(['e4']); // start (white to move), after e4 (black to move)
    const engine = fakeEngine([
      { cp: 20, bestUci: 'e2e4' },
      { cp: 30, bestUci: 'e7e5' },
    ]);
    const progress = vi.fn();
    const out = await new PositionEvaluator(engine).evaluateAll(positions, progress);
    expect(out.map((e) => [e.ply, e.cpWhite, e.bestUci])).toEqual([
      [0, 20, 'e2e4'],
      [1, -30, 'e7e5'],
    ]);
    expect(progress).toHaveBeenLastCalledWith(2, 2);
    expect(engine.dispose).toHaveBeenCalled();
  });

  it('scores terminal positions without the engine', async () => {
    const sans = 'e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#'.split(' ');
    const { positions } = new PositionBuilder().build(sans);
    const engine = fakeEngine(Array(7).fill({ cp: 0, bestUci: 'a2a3' }));
    const out = await new PositionEvaluator(engine).evaluateAll(positions, () => {});
    expect(engine.analyse).toHaveBeenCalledTimes(7); // not for the mated position
    expect(out[7]).toMatchObject({ ply: 7, cpWhite: 1000, bestUci: null }); // black is mated
  });

  it('disposes the engine when analysis fails', async () => {
    const { positions } = new PositionBuilder().build(['e4']);
    const engine = fakeEngine([]);
    engine.analyse.mockRejectedValue(new Error('hang'));
    await expect(new PositionEvaluator(engine).evaluateAll(positions, () => {})).rejects.toThrow('hang');
    expect(engine.dispose).toHaveBeenCalled();
  });
});
