import type { MoveEvent } from '../shared/types';

/**
 * Pure. begin() marks existing moves observedAt=null. onSnapshot() truncates to
 * the common prefix (takebacks), then appends new moves stamped with `now`.
 */
export class MoveLogger {
  begin(_initialSans: string[]): void {
    throw new Error('Not implemented');
  }

  onSnapshot(_sans: string[], _now: number): void {
    throw new Error('Not implemented');
  }

  moves(): MoveEvent[] {
    throw new Error('Not implemented');
  }
}
