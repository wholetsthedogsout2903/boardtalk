const FIGURINES: Record<string, string> = {
  '♔': 'K', '♕': 'Q', '♖': 'R', '♗': 'B', '♘': 'N',
  '♚': 'K', '♛': 'Q', '♜': 'R', '♝': 'B', '♞': 'N',
};

const SAN = /^(?:O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?$/;

/** Returns canonical-looking SAN, or null if the token is not a move. */
export function normalizeSan(raw: string): string | null {
  let t = raw.replace(/[\s ]+/g, '');
  t = t.replace(/[♔♕♖♗♘♚♛♜♝♞]/g, (c) => FIGURINES[c] ?? c);
  t = t.replace(/[!?]+$/, '');
  t = t.replace(/^0-0-0/, 'O-O-O').replace(/^0-0/, 'O-O');
  return SAN.test(t) ? t : null;
}
