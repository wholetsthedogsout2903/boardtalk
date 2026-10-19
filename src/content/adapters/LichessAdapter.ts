import type { Color } from '../../shared/types';
import type { SiteAdapter } from './SiteAdapter';

export class LichessAdapter implements SiteAdapter {
  readonly siteId = 'lichess' as const;

  userColor(): Color | null {
    throw new Error('Not implemented');
  }

  readMoves(): string[] {
    throw new Error('Not implemented');
  }

  moveListRoot(): Element | null {
    throw new Error('Not implemented');
  }
}
