import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecordingPayload } from '../shared/messages';
import { handleSave } from './service-worker';

const payload: RecordingPayload = {
  site: 'chesscom',
  gameUrl: 'u',
  userColor: 'black',
  startedAt: 1,
  durationMs: 2,
  audioMime: 'audio/webm',
  audioBase64: 'QUJD',
  moves: [],
};

beforeEach(() => {
  vi.stubGlobal('chrome', { runtime: { getURL: (p: string) => `chrome-extension://abc/${p}` } });
});

describe('handleSave', () => {
  it('saves, opens the review tab and returns the id', async () => {
    const repo = { save: vi.fn(async () => 'id1') };
    const openTab = vi.fn(async () => {});
    expect(await handleSave(payload, repo, openTab)).toEqual({ ok: true, id: 'id1' });
    expect(openTab).toHaveBeenCalledWith('chrome-extension://abc/review.html?id=id1');
  });

  it('still succeeds when the tab cannot be opened', async () => {
    const repo = { save: vi.fn(async () => 'id1') };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await handleSave(payload, repo, async () => {
      throw new Error('no tab');
    });
    expect(res).toEqual({ ok: true, id: 'id1' });
    warn.mockRestore();
  });

  it('rejects an invalid payload without saving', async () => {
    const repo = { save: vi.fn() };
    const res = await handleSave({ nope: true }, repo as never, vi.fn());
    expect(res.ok).toBe(false);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('reports save failures', async () => {
    const repo = { save: vi.fn(async () => Promise.reject(new Error('quota'))) };
    expect(await handleSave(payload, repo, vi.fn())).toEqual({ ok: false, error: 'quota' });
  });
});
