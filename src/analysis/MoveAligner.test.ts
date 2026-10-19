import { describe, expect, it } from 'vitest';
import { GAME, SEGMENTS, T0, gameMoves, recording } from '../test/fixtures';
import { MoveAligner } from './MoveAligner';

const speechByPly = (r: ReturnType<MoveAligner['align']>) =>
  Object.fromEntries(r.map((m) => [m.ply, m.speech]));

describe('MoveAligner', () => {
  const aligner = new MoveAligner();

  it('assigns everything said since your previous move to your next move', () => {
    const out = speechByPly(aligner.align(recording(), SEGMENTS));
    expect(out[1]).toBe('let me just develop');
    expect(out[3]).toBe('he played e5 so knight f3 attacks e5');
    expect(out[5]).toBe('bishop b5 pins the knight');
    expect(out[7]).toBe('a6 is a normal reply');
    expect(out[9]).toBeNull(); // silent
  });

  it('gives opponent plies no speech and drops speech after the last user move', () => {
    const aligned = aligner.align(recording(), SEGMENTS);
    expect(aligned.filter((m) => !m.isUser).every((m) => m.speech === null)).toBe(true);
    expect(aligned.map((m) => m.speech).join(' ')).not.toContain('after my last move');
    expect(aligned).toHaveLength(GAME.length);
  });

  it('puts a segment that starts exactly at a move on the next move', () => {
    const seg = [{ start: 12, end: 14, text: 'just played it', noSpeechProb: 0 }]; // ply 1 appears at +12 s
    const out = speechByPly(aligner.align(recording(), seg));
    expect(out[1]).toBeNull();
    expect(out[3]).toBe('just played it');
  });

  it('handles the user playing black', () => {
    const seg = [{ start: 20, end: 22, text: 'he opened e4', noSpeechProb: 0 }];
    const out = speechByPly(aligner.align(recording({ userColor: 'black' }), seg));
    expect(out[2]).toBeNull(); // e5 appeared at +15 s, before the speech
    expect(out[4]).toBe('he opened e4');
  });

  it('does not count or fill untimed (pre-existing) user moves', () => {
    const rec = recording({ moves: gameMoves(4) }); // plies 1-4 untimed
    const out = aligner.align(rec, [{ start: 1, end: 2, text: 'early', noSpeechProb: 0 }]);
    expect(out[0]!.speech).toBeNull();
    expect(speechByPly(out)[5]).toBe('early'); // first timed user move
  });

  it('treats whitespace-only text as silent', () => {
    const out = aligner.align(recording(), [{ start: 3, end: 4, text: '   ', noSpeechProb: 0 }]);
    expect(out[0]!.speech).toBeNull();
  });

  it('uses startedAt as the clock origin', () => {
    const shifted = recording({ startedAt: T0 + 10_000 }); // audio started 10 s later
    const out = speechByPly(aligner.align(shifted, [{ start: 3, end: 4, text: 'x', noSpeechProb: 0 }]));
    expect(out[1]).toBeNull(); // 3 s after audio start = +13 s, after ply 1 (+12 s)
    expect(out[3]).toBe('x');
  });
});
