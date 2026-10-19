import type { Position, PositionEval } from '../shared/types';
import type { StockfishEngine } from './StockfishEngine';

/**
 * Terminal positions are scored without the engine (mate = max, draw = 0).
 * Everything else goes through the engine, normalised to white's POV.
 */
export class PositionEvaluator {
  constructor(private readonly engine: StockfishEngine) {}

  evaluateAll(
    _positions: Position[],
    _onProgress: (done: number, total: number) => void,
  ): Promise<PositionEval[]> {
    throw new Error('Not implemented');
  }
}
