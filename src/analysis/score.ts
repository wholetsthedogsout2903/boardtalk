import type { Color } from '../shared/types';
import { MATE_CLAMP_CP } from './config';
import type { EngineScore } from './StockfishEngine';

/** Engine score is side-to-move POV; result is white's POV, clamped. */
export function toWhiteCp(score: EngineScore, sideToMove: Color): number {
  let raw: number;
  if (score.mate !== undefined) {
    raw = score.mate > 0 ? MATE_CLAMP_CP : -MATE_CLAMP_CP; // mate 0 = side to move is mated
  } else if (score.cp !== undefined) {
    raw = Math.max(-MATE_CLAMP_CP, Math.min(MATE_CLAMP_CP, score.cp));
  } else {
    throw new Error('Engine returned no score');
  }
  return sideToMove === 'white' ? raw : -raw;
}

export function toUserCp(cpWhite: number, userColor: Color): number {
  return userColor === 'white' ? cpWhite : -cpWhite;
}
