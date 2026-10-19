import type { Position } from '../shared/types';

/**
 * Replays SAN with chess.js. Stops at the first illegal SAN (returns the
 * truncated list). Marks terminal positions (mate / draw).
 */
export class PositionBuilder {
  build(_sans: string[]): Position[] {
    throw new Error('Not implemented');
  }
}
