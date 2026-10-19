import type { AlignedMove, Color, KeyMoment, PositionEval } from '../shared/types';

export interface KeyMomentOptions {
  topN: number; // 3
  minLossCp: number; // 100
  decidedCp: number; // 700
}

/**
 * Pure (plus chess.js for bestUci -> bestSan). Over timestamped user moves:
 * cpLoss = evalBefore - evalAfter in the user's POV; skips |evalBefore| >
 * decidedCp or cpLoss < minLossCp; top N by loss, returned in game order.
 */
export class KeyMomentFinder {
  find(
    _color: Color,
    _aligned: AlignedMove[],
    _evals: PositionEval[],
    _opts: KeyMomentOptions,
  ): KeyMoment[] {
    throw new Error('Not implemented');
  }
}
