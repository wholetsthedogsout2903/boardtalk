// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MoveListWatcher } from './MoveListWatcher';

const flush = () => new Promise<void>((r) => queueMicrotask(r));

function setup() {
  let root: Element | null = null;
  const moves: string[] = [];
  const adapter = {
    siteId: 'lichess' as const,
    userColor: () => 'white' as const,
    readMoves: () => [...moves],
    moveListRoot: () => root,
  };
  return {
    adapter,
    moves,
    mount: () => {
      root = document.createElement('div');
      document.body.append(root);
      return root;
    },
    unmount: () => {
      root?.remove();
      root = null;
    },
  };
}

describe('MoveListWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    document.body.replaceChildren();
  });
  afterEach(() => vi.useRealTimers());

  it('emits the full list with a timestamp when the list changes', async () => {
    const s = setup();
    const root = s.mount();
    const handler = vi.fn();
    const w = new MoveListWatcher(s.adapter);
    w.start(handler);
    expect(handler).toHaveBeenCalledTimes(1); // snapshot on attach
    vi.setSystemTime(5000);
    s.moves.push('e4');
    root.append(document.createElement('span'));
    await flush();
    expect(handler).toHaveBeenLastCalledWith(['e4'], 5000);
    w.stop();
  });

  it('attaches late when the list is mounted after start', async () => {
    const s = setup();
    const handler = vi.fn();
    const w = new MoveListWatcher(s.adapter);
    w.start(handler);
    expect(handler).not.toHaveBeenCalled();
    s.moves.push('e4');
    s.mount();
    vi.advanceTimersByTime(500);
    expect(handler).toHaveBeenCalledWith(['e4'], expect.any(Number));
    w.stop();
  });

  it('re-attaches when the root is replaced', async () => {
    const s = setup();
    s.mount();
    const handler = vi.fn();
    const w = new MoveListWatcher(s.adapter);
    w.start(handler);
    s.unmount();
    const root2 = s.mount();
    vi.advanceTimersByTime(500);
    const before = handler.mock.calls.length;
    s.moves.push('d4');
    root2.append(document.createElement('i'));
    await flush();
    expect(handler.mock.calls.length).toBeGreaterThan(before);
    w.stop();
  });

  it('stops emitting after stop()', async () => {
    const s = setup();
    const root = s.mount();
    const handler = vi.fn();
    const w = new MoveListWatcher(s.adapter);
    w.start(handler);
    w.stop();
    const n = handler.mock.calls.length;
    root.append(document.createElement('b'));
    await flush();
    vi.advanceTimersByTime(2000);
    expect(handler.mock.calls.length).toBe(n);
  });

  it('survives a throwing handler', async () => {
    const s = setup();
    const root = s.mount();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const w = new MoveListWatcher(s.adapter);
    w.start(() => {
      throw new Error('bad');
    });
    root.append(document.createElement('b'));
    await flush();
    expect(warn).toHaveBeenCalled();
    w.stop();
    warn.mockRestore();
  });
});
