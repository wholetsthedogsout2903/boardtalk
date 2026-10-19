import type { MoveEvent } from '../shared/types';

/**
 * Pure. begin() marks existing moves observedAt=null. onSnapshot() ignores
 * shorter snapshots (transient re-renders), truncates to the common prefix on
 * divergence (takeback + replay), then appends new moves stamped with `at`.
 */
export class MoveLogger {
  private list: MoveEvent[] = [];

  begin(initialSans: string[]): void {
    this.list = initialSans.map((san, i) => ({ ply: i + 1, san, observedAt: null }));
  }

  onSnapshot(sans: string[], at: number): void {
    if (sans.length < this.list.length) return;
    let k = 0;
    while (k < this.list.length && this.list[k]!.san === sans[k]) k++;
    if (k < this.list.length) this.list.length = k;
    for (let i = k; i < sans.length; i++) {
      this.list.push({ ply: i + 1, san: sans[i]!, observedAt: at });
    }
  }

  moves(): MoveEvent[] {
    return this.list.map((m) => ({ ...m }));
  }
}
