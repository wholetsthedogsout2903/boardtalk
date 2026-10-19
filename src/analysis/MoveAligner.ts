import type { AlignedMove, Color, Recording, TranscriptSegment } from '../shared/types';

export function isUserPly(ply: number, color: Color): boolean {
  return color === 'white' ? ply % 2 === 1 : ply % 2 === 0;
}

/**
 * Pure. A segment's absolute time is startedAt + start*1000. It goes to the
 * first timestamped user move with observedAt > that time (everything said
 * since your previous move belongs to your next move). Segments after the
 * user's last move are dropped.
 */
export class MoveAligner {
  align(
    rec: Pick<Recording, 'moves' | 'userColor' | 'startedAt'>,
    segments: TranscriptSegment[],
  ): AlignedMove[] {
    const timedUser = rec.moves.filter(
      (m) => isUserPly(m.ply, rec.userColor) && m.observedAt !== null,
    );
    const buckets = new Map<number, string[]>();
    for (const seg of segments) {
      const t = rec.startedAt + seg.start * 1000;
      const target = timedUser.find((m) => (m.observedAt as number) > t);
      if (!target) continue;
      const text = seg.text.trim();
      if (!text) continue;
      const list = buckets.get(target.ply) ?? [];
      list.push(text);
      buckets.set(target.ply, list);
    }
    return rec.moves.map((m) => {
      const isUser = isUserPly(m.ply, rec.userColor);
      const timed = isUser && m.observedAt !== null;
      const speech = timed ? (buckets.get(m.ply)?.join(' ').trim() ?? '') : '';
      return {
        ply: m.ply,
        san: m.san,
        isUser,
        observedAt: m.observedAt,
        speech: speech.length > 0 ? speech : null,
      };
    });
  }
}
