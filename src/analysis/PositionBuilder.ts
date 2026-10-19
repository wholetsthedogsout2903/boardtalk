import { Chess } from 'chess.js';
import type { Position } from '../shared/types';

export interface BuildResult {
  positions: Position[]; // positions[0] is the start position; positions[k] is after ply k
  illegalAtPly: number | null;
}

/** Replays SAN with chess.js. Stops at the first illegal SAN. */
export class PositionBuilder {
  build(sans: string[]): BuildResult {
    const chess = new Chess();
    const positions: Position[] = [
      { ply: 0, fen: chess.fen(), lastSan: null, terminal: null },
    ];
    for (let i = 0; i < sans.length; i++) {
      let move;
      try {
        move = chess.move(sans[i]!);
      } catch {
        return { positions, illegalAtPly: i + 1 };
      }
      positions.push({
        ply: i + 1,
        fen: chess.fen(),
        lastSan: move.san,
        terminal: chess.isCheckmate() ? 'mate' : chess.isDraw() ? 'draw' : null,
      });
    }
    return { positions, illegalAtPly: null };
  }
}
