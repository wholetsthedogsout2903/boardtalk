import { describe, expect, it } from 'vitest';
import { SEGMENTS, evalsFor, positions, recording } from '../test/fixtures';
import { KEY_MOMENTS } from './config';
import { KeyMomentFinder } from './KeyMomentFinder';
import { MoveAligner } from './MoveAligner';

const pos = positions();
const aligned = new MoveAligner().align(recording(), SEGMENTS);
const finder = new KeyMomentFinder();

describe('KeyMomentFinder', () => {
  it('picks big losses in undecided positions, in game order', () => {
    const out = finder.find('white', pos, aligned, evalsFor(pos), KEY_MOMENTS);
    expect(out.map((m) => m.ply)).toEqual([3, 9]);
    const first = out[0]!;
    expect(first).toMatchObject({
      playedSan: 'Nf3',
      bestSan: 'Bc4',
      opponentLastSan: 'e5',
      evalBeforeCp: 30,
      evalAfterCp: -310,
      cpLoss: 340,
      speech: 'he played e5 so knight f3 attacks e5',
    });
    expect(out[1]).toMatchObject({ playedSan: 'O-O', bestSan: 'd3', cpLoss: 430, speech: null });
  });

  it('skips decided positions and small losses', () => {
    const out = finder.find('white', pos, aligned, evalsFor(pos), KEY_MOMENTS);
    expect(out.map((m) => m.ply)).not.toContain(5); // before-eval +820 is beyond 700
    expect(out.map((m) => m.ply)).not.toContain(7); // loss 80 < 100
  });

  it('applies the 700 / 100 boundaries inclusively', () => {
    const cp = [0, 0, 700, 600, 0, 0, 0, 0, 0, 0]; // ply 3: before +700 (kept), loss exactly 100
    const out = finder.find('white', pos, aligned, evalsFor(pos, cp), KEY_MOMENTS);
    expect(out.map((m) => m.ply)).toEqual([3]);
    const decided = [0, 0, 701, 600, 0, 0, 0, 0, 0, 0];
    expect(finder.find('white', pos, aligned, evalsFor(pos, decided), KEY_MOMENTS)).toEqual([]);
  });

  it('keeps only the top N by loss', () => {
    const out = finder.find('white', pos, aligned, evalsFor(pos), { ...KEY_MOMENTS, topN: 1 });
    expect(out.map((m) => m.ply)).toEqual([9]);
  });

  it('skips a move that is the engine best move', () => {
    const best = { 2: 'g1f3', 8: 'd2d3' }; // Nf3 is the engine's choice at ply 3
    const out = finder.find('white', pos, aligned, evalsFor(pos, undefined, best), KEY_MOMENTS);
    expect(out.map((m) => m.ply)).toEqual([9]);
  });

  it('skips moves with missing evals', () => {
    const partial = evalsFor(pos).filter((e) => e.ply !== 3);
    expect(finder.find('white', pos, aligned, partial, KEY_MOMENTS).map((m) => m.ply)).toEqual([9]);
  });

  it('ignores untimed user moves', () => {
    const untimed = aligned.map((m) => (m.ply === 3 ? { ...m, observedAt: null } : m));
    const out = finder.find('white', pos, untimed, evalsFor(pos), KEY_MOMENTS);
    expect(out.map((m) => m.ply)).toEqual([9]);
  });

  it('returns nothing when nothing qualifies', () => {
    const flat = Array(10).fill(0) as number[];
    expect(finder.find('white', pos, aligned, evalsFor(pos, flat), KEY_MOMENTS)).toEqual([]);
  });
});
