import type { ReviewResult } from '../shared/types';

/** Summary, habit, "silent on X of Y", then each key moment. Plain text only. */
export class ReviewView {
  render(_result: ReviewResult): void {
    throw new Error('Not implemented');
  }
}
