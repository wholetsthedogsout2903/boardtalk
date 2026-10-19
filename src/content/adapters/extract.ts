import { normalizeSan } from './normalizeSan';

export function movesFromTokens(tokens: string[]): string[] {
  const out: string[] = [];
  for (const t of tokens) {
    const san = normalizeSan(t);
    if (san) out.push(san);
  }
  return out;
}

/** Text of every leaf element under root, in DOM order. */
export function leafTexts(root: Element): string[] {
  const out: string[] = [];
  root.querySelectorAll('*').forEach((el) => {
    if (el.children.length === 0) out.push(el.textContent ?? '');
  });
  return out;
}

export function firstMatch(selectors: string[]): Element | null {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) return el;
  }
  return null;
}
