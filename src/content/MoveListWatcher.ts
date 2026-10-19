import type { SiteAdapter } from './adapters/SiteAdapter';

/**
 * Waits for the move list root to exist, attaches one MutationObserver
 * (already batched per task), plus a heartbeat that re-attaches if the root is late
 * or replaced. Emits the full SAN list with an observedAt timestamp on every change.
 */
export class MoveListWatcher {
  constructor(private readonly adapter: SiteAdapter) {}

  start(_onSnapshot: (sans: string[]) => void): void {
    throw new Error('Not implemented');
  }

  stop(): void {
    throw new Error('Not implemented');
  }
}
