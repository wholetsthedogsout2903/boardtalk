import { describe, expect, it } from 'vitest';
import { MoveLogger } from './MoveLogger';

const sans = (l: MoveLogger) => l.moves().map((m) => `${m.san}:${m.observedAt}`);

describe('MoveLogger', () => {
  it('marks moves present at begin() as untimed and stamps new ones', () => {
    const l = new MoveLogger();
    l.begin(['e4', 'e5', 'Nf3']);
    l.onSnapshot(['e4', 'e5', 'Nf3', 'Nc6'], 100);
    expect(sansWithPly(l)).toEqual(['1:e4:null', '2:e5:null', '3:Nf3:null', '4:Nc6:100']);
  });

  it('stamps a burst of moves with the same time', () => {
    const l = new MoveLogger();
    l.begin([]);
    l.onSnapshot(['e4', 'e5'], 50);
    expect(sans(l)).toEqual(['e4:50', 'e5:50']);
  });

  it('ignores identical snapshots', () => {
    const l = new MoveLogger();
    l.begin([]);
    l.onSnapshot(['e4'], 10);
    l.onSnapshot(['e4'], 99);
    expect(sans(l)).toEqual(['e4:10']);
  });

  it('ignores a shorter (blank) snapshot', () => {
    const l = new MoveLogger();
    l.begin([]);
    l.onSnapshot(['e4', 'e5'], 10);
    l.onSnapshot([], 20);
    l.onSnapshot(['e4'], 21);
    expect(sans(l)).toEqual(['e4:10', 'e5:10']);
  });

  it('truncates on divergence (takeback then a different move)', () => {
    const l = new MoveLogger();
    l.begin([]);
    l.onSnapshot(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'], 10);
    l.onSnapshot(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], 20); // takeback: ignored
    l.onSnapshot(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'], 30);
    expect(sans(l).slice(4)).toEqual(['Bb5:10', 'Nf6:30']);
  });

  it('returns copies', () => {
    const l = new MoveLogger();
    l.begin(['e4']);
    l.moves()[0]!.san = 'x';
    expect(l.moves()[0]!.san).toBe('e4');
  });
});

function sansWithPly(l: MoveLogger) {
  return l.moves().map((m) => `${m.ply}:${m.san}:${m.observedAt}`);
}
