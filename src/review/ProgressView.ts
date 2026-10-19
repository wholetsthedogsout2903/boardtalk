import type { Stage } from '../shared/types';

export class ProgressView {
  update(_stage: Stage, _done: number, _total: number): void {
    throw new Error('Not implemented');
  }
}
