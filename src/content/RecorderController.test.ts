// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { MicDeniedError } from './AudioRecorder';
import { RecorderController } from './RecorderController';
import type { Send } from './RecorderController';
import type { UiState } from './RecordButton';

const tick = () => new Promise((r) => setTimeout(r, 0));

function setup(opts: { color?: 'white' | 'black' | null; send?: Send; startError?: Error } = {}) {
  const calls: string[] = [];
  const renders: Array<[UiState, unknown]> = [];
  const adapter = {
    siteId: 'lichess' as const,
    userColor: () => (opts.color === undefined ? ('white' as const) : opts.color),
    readMoves: () => ['e4', 'e5'],
  };
  const audio = {
    start: vi.fn(async () => {
      calls.push('audio.start');
      if (opts.startError) throw opts.startError;
      return 5000;
    }),
    stop: vi.fn(async () => new Blob(['xyz'], { type: 'audio/webm;codecs=opus' })),
    onLost: vi.fn(),
  };
  let handler: (s: string[], at: number) => void = () => {};
  const watcher = {
    start: vi.fn((h: typeof handler) => {
      handler = h;
      calls.push('watcher.start');
    }),
    stop: vi.fn(),
  };
  const logged: Array<[string[], number]> = [];
  const logger = {
    begin: vi.fn(() => calls.push('logger.begin')),
    onSnapshot: vi.fn((s: string[], at: number) => logged.push([s, at])),
    moves: vi.fn(() => [{ ply: 1, san: 'e4', observedAt: null }, { ply: 3, san: 'Nf3', observedAt: 9000 }]),
  };
  let click: () => void = () => {};
  const button = {
    render: vi.fn((s: UiState, d?: unknown) => renders.push([s, d])),
    onClick: vi.fn((cb: () => void) => (click = cb)),
  };
  const send: Send = opts.send ?? vi.fn(async () => ({ ok: true as const, id: 'id1' }));
  const c = new RecorderController(adapter, audio, watcher, logger, button, send, () => 8000);
  return { c, audio, watcher, logger, button, send, calls, renders, click: () => click(), emit: (s: string[], at: number) => handler(s, at), logged };
}

const last = (s: ReturnType<typeof setup>) => s.renders.at(-1)![0];

describe('RecorderController', () => {
  it('starts audio before logging moves, then records snapshots', async () => {
    const s = setup();
    s.click();
    await tick();
    expect(s.calls).toEqual(['audio.start', 'logger.begin', 'watcher.start']);
    expect(last(s)).toBe('recording');
    s.emit(['e4', 'e5', 'Nf3'], 123);
    expect(s.logged).toEqual([[['e4', 'e5', 'Nf3'], 123]]);
  });

  it('refuses to start without a board', async () => {
    const s = setup({ color: null });
    s.click();
    await tick();
    expect(s.audio.start).not.toHaveBeenCalled();
    expect(s.renders.at(-1)).toEqual(['error', { message: 'Open a game first.' }]);
  });

  it('reports a blocked microphone', async () => {
    const s = setup({ startError: new MicDeniedError('x') });
    s.click();
    await tick();
    expect(s.renders.at(-1)![1]).toMatchObject({ message: expect.stringContaining('Microphone blocked') });
  });

  it('stops, builds the payload and saves it', async () => {
    const s = setup();
    s.click();
    await tick();
    s.click();
    await tick();
    await tick();
    expect(s.watcher.stop).toHaveBeenCalled();
    const msg = vi.mocked(s.send).mock.calls[0]![0];
    expect(msg.type).toBe('recording:save');
    expect(msg.payload).toMatchObject({
      site: 'lichess',
      userColor: 'white',
      startedAt: 5000,
      durationMs: 3000,
      audioMime: 'audio/webm;codecs=opus',
      moves: [{ san: 'e4' }, { san: 'Nf3' }],
    });
    expect(msg.payload.audioBase64.length).toBeGreaterThan(0);
    expect(s.renders.at(-1)).toEqual(['idle', { message: 'Saved' }]);
  });

  it('keeps the payload for retry when saving fails', async () => {
    const send = vi
      .fn<Send>()
      .mockResolvedValueOnce({ ok: false, error: 'x' })
      .mockResolvedValueOnce({ ok: true, id: 'id2' });
    const s = setup({ send });
    s.click();
    await tick();
    s.click();
    await tick();
    await tick();
    expect(last(s)).toBe('save_failed');
    s.click(); // retry
    await tick();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1]![0]).toEqual(send.mock.calls[0]![0]);
    expect(s.renders.at(-1)![0]).toBe('idle');
  });

  it('treats a missing response as a failure', async () => {
    const s = setup({ send: vi.fn(async () => undefined) });
    s.click();
    await tick();
    s.click();
    await tick();
    await tick();
    expect(last(s)).toBe('save_failed');
  });

  it('warns when no moves were captured', async () => {
    const s = setup();
    s.logger.moves.mockReturnValue([]);
    s.click();
    await tick();
    s.click();
    await tick();
    await tick();
    expect(s.renders.at(-1)![1]).toMatchObject({ message: expect.stringContaining('no moves were detected') });
  });
});
