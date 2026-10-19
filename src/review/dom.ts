/** Builds elements with textContent only. innerHTML is banned in this codebase. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { text?: string; attrs?: Record<string, string> } = {},
  children: Array<Node | string> = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.text !== undefined) node.textContent = props.text;
  for (const [k, v] of Object.entries(props.attrs ?? {})) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}
