import type { Color } from '../../shared/types';
import { firstMatch, leafTexts, movesFromTokens } from './extract';
import type { SiteAdapter } from './SiteAdapter';

// All lichess DOM knowledge lives here. Lichess renames its move-list tags
// periodically, so we read leaf text under the list root and let normalizeSan
// reject move numbers, results and clocks. Selectors are unverified against
// the live site.
const BOARD = ['.cg-wrap'];
const MOVE_LIST_ROOT = ['.rmoves', '.tview2', '.analyse__moves'];

export class LichessAdapter implements SiteAdapter {
  readonly siteId = 'lichess' as const;

  userColor(): Color | null {
    const board = firstMatch(BOARD);
    if (!board) return null;
    return board.classList.contains('orientation-black') ? 'black' : 'white';
  }

  readMoves(): string[] {
    const root = this.moveListRoot();
    return root ? movesFromTokens(leafTexts(root)) : [];
  }

  moveListRoot(): Element | null {
    return firstMatch(MOVE_LIST_ROOT);
  }
}
