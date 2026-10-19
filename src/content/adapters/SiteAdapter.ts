import type { Color, SiteId } from '../../shared/types';

/** The only place site-specific DOM selectors may live. */
export interface SiteAdapter {
  readonly siteId: SiteId;
  /** From board orientation; null if the board isn't found. */
  userColor(): Color | null;
  /** Full current move list as normalised SAN. */
  readMoves(): string[];
  moveListRoot(): Element | null;
}
