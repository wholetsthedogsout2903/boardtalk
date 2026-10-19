import type { Position, PositionEval } from '../shared/types';
import { MATE_CLAMP_CP, MOVETIME_MS } from './config';
import { sideToMove } from './chessUtil';
import { toWhiteCp } from './score';
import type { StockfishEngine } from './StockfishEngine';

/**
 * Terminal positions are scored without the engine (mate = max, draw = 0).
 * Everything else goes through the engine, normalised to white's POV.
 */
export class PositionEvaluator {
  constructor(private readonly engine: Pick<StockfishEngine, 'init' | 'analyse' | 'dispose'>) {}

  async evaluateAll(
    positions: Position[],
    onProgress: (done: number, total: number) => void,
  ): Promise<PositionEval[]> {
    const out: PositionEval[] = [];
    if (positions.some((p) => p.terminal === null)) await this.engine.init();
    try {
      for (let i = 0; i < positions.length; i++) {
        const p = positions[i]!;
        const stm = sideToMove(p.fen);
        let cpWhite: number;
        let bestUci: string | null = null;
        if (p.terminal === 'mate') {
          cpWhite = stm === 'white' ? -MATE_CLAMP_CP : MATE_CLAMP_CP; // side to move is mated
        } else if (p.terminal === 'draw') {
          cpWhite = 0;
        } else {
          const s = await this.engine.analyse(p.fen, MOVETIME_MS);
          cpWhite = toWhiteCp(s, stm);
          bestUci = s.bestUci;
        }
        out.push({ ply: p.ply, fen: p.fen, cpWhite, bestUci });
        onProgress(i + 1, positions.length);
      }
    } finally {
      this.engine.dispose();
    }
    return out;
  }
}
