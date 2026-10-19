import { describe, expect, it } from 'vitest';
import { toUserCp, toWhiteCp } from './score';

describe('score', () => {
  it('converts side-to-move scores to white POV', () => {
    expect(toWhiteCp({ cp: 50, bestUci: null }, 'white')).toBe(50);
    expect(toWhiteCp({ cp: 50, bestUci: null }, 'black')).toBe(-50);
  });

  it('clamps centipawns and mate scores', () => {
    expect(toWhiteCp({ cp: -2300, bestUci: null }, 'white')).toBe(-1000);
    expect(toWhiteCp({ mate: 3, bestUci: null }, 'white')).toBe(1000);
    expect(toWhiteCp({ mate: -2, bestUci: null }, 'black')).toBe(1000);
    expect(toWhiteCp({ mate: 0, bestUci: null }, 'white')).toBe(-1000); // side to move is mated
  });

  it('throws when the engine gave no score', () => {
    expect(() => toWhiteCp({ bestUci: 'e2e4' }, 'white')).toThrow();
  });

  it('converts to the user POV', () => {
    expect(toUserCp(120, 'white')).toBe(120);
    expect(toUserCp(120, 'black')).toBe(-120);
  });
});
