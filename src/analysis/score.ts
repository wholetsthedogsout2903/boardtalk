import type { Color } from '../shared/types';
import type { EngineScore } from './StockfishEngine';

/** Mate scores become +/-1000 cp for loss maths. */
export const MATE_CLAMP_CP = 1000;

/** Engine score is side-to-move POV; result is white's POV. */
export function toWhiteCp(_score: EngineScore, _sideToMove: Color): number {
  throw new Error('Not implemented');
}

export function toUserCp(_cpWhite: number, _userColor: Color): number {
  throw new Error('Not implemented');
}
