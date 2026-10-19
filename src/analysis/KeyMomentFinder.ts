import type { AlignedMove, Color, KeyMoment, Position, PositionEval } from '../shared/types';
import { uciToSan } from './chessUtil';
import { toUserCp } from './score';

export interface KeyMomentOptions {
  topN: number;
  minLossCp: number;
  decidedCp: number;
}

/**
 * Pure (chess.js only for bestUci -> SAN). Over timestamped user moves:
 * cpLoss = evalBefore - evalAfter in the user's POV. Skips moves where the
 * position was already decided, the loss is small, or the user played the
 * engine's move. Top N by loss, returned in game order.
 */
export class KeyMomentFinder {
  find(
    color: Color,
    positions: Position[],
    aligned: AlignedMove[],
    evals: PositionEval[],
    opts: KeyMomentOptions,
  ): KeyMoment[] {
    const evalByPly = new Map(evals.map((e) => [e.ply, e]));
    const out: KeyMoment[] = [];
    for (const m of aligned) {
      if (!m.isUser || m.observedAt === null) continue;
      const before = evalByPly.get(m.ply - 1);
      const after = evalByPly.get(m.ply);
      const posBefore = positions[m.ply - 1];
      const posAfter = positions[m.ply];
      if (!before || !after || !posBefore || !posAfter || !posAfter.lastSan) continue;
      const userBefore = toUserCp(before.cpWhite, color);
      const userAfter = toUserCp(after.cpWhite, color);
      if (Math.abs(userBefore) > opts.decidedCp) continue;
      const cpLoss = userBefore - userAfter;
      if (cpLoss < opts.minLossCp) continue;
      if (!before.bestUci) continue;
      const bestSan = uciToSan(before.fen, before.bestUci);
      if (!bestSan || bestSan === posAfter.lastSan) continue;
      out.push({
        ply: m.ply,
        fenBefore: posBefore.fen,
        opponentLastSan: posBefore.lastSan,
        playedSan: posAfter.lastSan,
        bestSan,
        evalBeforeCp: userBefore,
        evalAfterCp: userAfter,
        cpLoss,
        speech: m.speech,
      });
    }
    out.sort((a, b) => b.cpLoss - a.cpLoss); // stable: earlier ply wins ties
    return out.slice(0, opts.topN).sort((a, b) => a.ply - b.ply);
  }
}
