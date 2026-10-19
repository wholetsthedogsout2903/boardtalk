import type { SiteAdapter } from './adapters/SiteAdapter';

export type SnapshotHandler = (sans: string[], observedAt: number) => void;

const HEARTBEAT_MS = 500;

/**
 * Observes the move list root (MutationObserver is already batched per task, so
 * no debounce) and emits the full SAN list with a timestamp on every change.
 * A heartbeat re-attaches if the root is mounted late or replaced.
 */
export class MoveListWatcher {
  private handler: SnapshotHandler | null = null;
  private observer: MutationObserver | null = null;
  private root: Element | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly adapter: SiteAdapter) {}

  start(handler: SnapshotHandler): void {
    this.stop();
    this.handler = handler;
    this.ensureAttached();
    this.timer = setInterval(() => this.ensureAttached(), HEARTBEAT_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.observer?.disconnect();
    this.observer = null;
    this.root = null;
    this.handler = null;
  }

  private ensureAttached(): void {
    const root = this.adapter.moveListRoot();
    if (root === this.root && root?.isConnected) return;
    this.observer?.disconnect();
    this.observer = null;
    this.root = root;
    if (!root) return;
    this.observer = new MutationObserver(() => this.emit(Date.now()));
    this.observer.observe(root, { childList: true, subtree: true, characterData: true });
    this.emit(Date.now());
  }

  private emit(at: number): void {
    if (!this.handler) return;
    try {
      this.handler(this.adapter.readMoves(), at);
    } catch (err) {
      console.warn('[Boardtalk] move snapshot failed', err);
    }
  }
}
