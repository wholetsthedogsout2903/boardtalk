/** "14." for white's 14th move, "14…" for black's. */
export function moveHeading(ply: number, san: string): string {
  const n = Math.ceil(ply / 2);
  return `${n}${ply % 2 === 1 ? '.' : '…'} ${san}`;
}

/** Centipawns to a signed pawn value with one decimal, e.g. "+0.3", "−3.1". */
export function formatEval(cp: number): string {
  const v = Math.abs(Math.round(cp / 10) / 10).toFixed(1);
  if (cp > 0) return `+${v}`;
  if (cp < 0 && v !== '0.0') return `−${v}`;
  return '0.0';
}

export function formatEvalChange(before: number, after: number): string {
  return `${formatEval(before)} → ${formatEval(after)} (${formatEval(after - before)})`;
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function siteName(site: 'chesscom' | 'lichess'): string {
  return site === 'chesscom' ? 'chess.com' : 'lichess.org';
}
