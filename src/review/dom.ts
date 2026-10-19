/** Builds elements with textContent only. innerHTML is banned in this codebase. */
export function el(
  _tag: string,
  _props?: { text?: string; className?: string },
  _children?: Array<HTMLElement | string>,
): HTMLElement {
  throw new Error('Not implemented');
}
