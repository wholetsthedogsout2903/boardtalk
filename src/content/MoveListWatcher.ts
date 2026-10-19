import type { SiteAdapter } from './adapters/SiteAdapter';

/**
 * Waits for the move list root to exist, attaches one MutationObserver
 * (rAF-debounced), and emits the full SAN list on every change.
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
