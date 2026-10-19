import type { Color } from '../../shared/types';
import { firstMatch, leafTexts, movesFromTokens } from './extract';
import type { SiteAdapter } from './SiteAdapter';

// All chess.com DOM knowledge lives here. Selectors are unverified against the
// live site and are the first thing to fix when the adapter returns no moves.
const BOARD = ['wc-chess-board', 'chess-board'];
const MOVE_LIST_ROOT = ['wc-move-list', 'wc-simple-move-list', '.move-list-component'];
const MOVE_NODE = '.node';

const PIECE_CLASS = /(?:^|\s)(pawn|knight|bishop|rook|queen|king)-(?:white|black)(?:\s|$)/;
const PIECE_LETTER: Record<string, string> = {
  pawn: '', knight: 'N', bishop: 'B', rook: 'R', queen: 'Q', king: 'K',
};

/** Text of a move node, with chess.com's figurine icons converted to letters. */
function nodeText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof Element)) return '';
  const figurine = node.getAttribute('data-figurine');
  if (figurine !== null) return figurine;
  const m = PIECE_CLASS.exec(node.getAttribute('class') ?? '');
  if (m && m[1] !== undefined && node.children.length === 0) return PIECE_LETTER[m[1]] ?? '';
  return Array.from(node.childNodes).map(nodeText).join('');
}

export class ChessComAdapter implements SiteAdapter {
  readonly siteId = 'chesscom' as const;

  userColor(): Color | null {
    const board = firstMatch(BOARD);
    if (!board) return null;
    return board.classList.contains('flipped') ? 'black' : 'white';
  }

  readMoves(): string[] {
    const root = this.moveListRoot();
    if (!root) return [];
    const nodes = Array.from(root.querySelectorAll(MOVE_NODE));
    if (nodes.length > 0) return movesFromTokens(nodes.map(nodeText));
    return movesFromTokens(leafTexts(root));
  }

  moveListRoot(): Element | null {
    return firstMatch(MOVE_LIST_ROOT);
  }
}
