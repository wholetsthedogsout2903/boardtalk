import { PositionBuilder } from '../analysis/PositionBuilder';
import type { MoveEvent, Position, PositionEval, Recording, TranscriptSegment } from '../shared/types';

/** Plies 1..9. The user is white (odd plies). */
export const GAME = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'];
export const T0 = 1_000_000;
/** Seconds after T0 at which each ply appeared on screen. */
export const OBS_SECONDS = [12, 15, 40, 44, 80, 84, 120, 124, 150];

/** White-POV eval after ply k (index 0 = start position). */
export const CP_WHITE = [0, 20, 30, -310, 820, 700, -40, -120, 10, -420];
/** Engine's best move in the position before ply 3 and before ply 9. */
export const BEST_UCI: Record<number, string> = { 2: 'f1c4', 8: 'd2d3' };

export const SEGMENTS: TranscriptSegment[] = [
  { start: 3, end: 8, text: 'let me just develop', noSpeechProb: 0.05 },
  { start: 20, end: 24, text: 'he played e5 so', noSpeechProb: 0.05 },
  { start: 30, end: 36, text: 'knight f3 attacks e5', noSpeechProb: 0.05 },
  { start: 60, end: 66, text: 'bishop b5 pins the knight', noSpeechProb: 0.05 },
  { start: 100, end: 104, text: 'a6 is a normal reply', noSpeechProb: 0.05 },
  { start: 200, end: 204, text: 'after my last move', noSpeechProb: 0.05 },
];

export function gameMoves(untimedPlies = 0): MoveEvent[] {
  return GAME.map((san, i) => ({
    ply: i + 1,
    san,
    observedAt: i < untimedPlies ? null : T0 + OBS_SECONDS[i]! * 1000,
  }));
}

export function recording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 'rec1',
    site: 'lichess',
    gameUrl: 'https://lichess.org/abc',
    userColor: 'white',
    startedAt: T0,
    durationMs: 200_000,
    audioMime: 'audio/webm;codecs=opus',
    moves: gameMoves(),
    analysis: {},
    createdAt: T0,
    ...overrides,
  };
}

export function positions(): Position[] {
  return new PositionBuilder().build(GAME).positions;
}

export function evalsFor(
  pos: Position[],
  cp: number[] = CP_WHITE,
  best: Record<number, string> = BEST_UCI,
): PositionEval[] {
  return pos.map((p) => ({ ply: p.ply, fen: p.fen, cpWhite: cp[p.ply]!, bestUci: best[p.ply] ?? null }));
}
