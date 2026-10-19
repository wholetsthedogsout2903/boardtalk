import type { AlignedMove, Recording, TranscriptSegment } from '../shared/types';

/**
 * Pure. segStartMs = startedAt + seg.start * 1000. A segment goes to the first
 * timestamped user move with observedAt > segStartMs. Segments after the user's
 * last move are dropped.
 */
export class MoveAligner {
  align(_rec: Recording, _segments: TranscriptSegment[]): AlignedMove[] {
    throw new Error('Not implemented');
  }
}
