// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { blobToBase64 } from '../base64';
import type { RecordingPayload } from '../messages';
import { RecordingRepository } from './RecordingRepository';
import type { KV } from './RecordingRepository';
import { DEFAULT_SETTINGS, SettingsRepository, normalizeSettings } from './SettingsRepository';

function fakeKV(): KV & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return {
    data,
    async get(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => data.has(k)).map((k) => [k, data.get(k)]));
    },
    async set(items) {
      for (const [k, v] of Object.entries(items)) data.set(k, v);
    },
  };
}

const payload = async (): Promise<RecordingPayload> => ({
  site: 'lichess',
  gameUrl: 'https://lichess.org/x',
  userColor: 'white',
  startedAt: 5,
  durationMs: 10,
  audioMime: 'audio/webm;codecs=opus',
  audioBase64: await blobToBase64(new Blob(['hello audio'])),
  moves: [{ ply: 1, san: 'e4', observedAt: 7 }],
});

describe('RecordingRepository', () => {
  let kv: ReturnType<typeof fakeKV>;
  let repo: RecordingRepository;
  beforeEach(() => {
    kv = fakeKV();
    repo = new RecordingRepository(kv);
  });

  it('saves and reads back a recording with its audio', async () => {
    const id = await repo.save(await payload());
    const rec = await repo.get(id);
    expect(rec).toMatchObject({ id, userColor: 'white', moves: [{ san: 'e4' }], analysis: {} });
    expect(JSON.stringify(rec)).not.toContain('audioBase64');
    const audio = await repo.getAudio(id);
    expect(audio.type).toBe('audio/webm;codecs=opus');
    expect(audio.size).toBe('hello audio'.length);
    expect(await repo.latestId()).toBe(id);
  });

  it('returns null for an unknown id and null latestId when empty', async () => {
    expect(await repo.get('nope')).toBeNull();
    expect(await repo.latestId()).toBeNull();
  });

  it('assembles analysis from per-stage keys', async () => {
    const id = await repo.save(await payload());
    await repo.saveStage(id, 'transcript', [{ start: 0, end: 1, text: 'a', noSpeechProb: 0 }]);
    await repo.saveStage(id, 'evals', [{ ply: 0, fen: 'f', cpWhite: 0, bestUci: null }]);
    const rec = await repo.get(id);
    expect(Object.keys(rec!.analysis).sort()).toEqual(['evals', 'transcript']);
  });

  it('keeps the newest recording last in the index', async () => {
    const a = await repo.save(await payload());
    const b = await repo.save(await payload());
    expect(a).not.toBe(b);
    expect(await repo.latestId()).toBe(b);
  });
});

describe('SettingsRepository', () => {
  it('returns defaults, merges stored values, and normalises on save', async () => {
    const repo = new SettingsRepository(fakeKV());
    expect(await repo.get()).toEqual(DEFAULT_SETTINGS);
    await repo.save({ ...DEFAULT_SETTINGS, whisperApiKey: '  sk  ', llmBaseUrl: 'https://x.test/v1///' });
    expect(await repo.get()).toMatchObject({ whisperApiKey: 'sk', llmBaseUrl: 'https://x.test/v1' });
  });

  it('rejects bad base URLs and empty models', () => {
    const base = DEFAULT_SETTINGS;
    expect(() => normalizeSettings({ ...base, llmBaseUrl: 'not a url' })).toThrow(/valid URL/);
    expect(() => normalizeSettings({ ...base, llmBaseUrl: 'http://example.com' })).toThrow(/https/);
    expect(() => normalizeSettings({ ...base, llmModel: ' ' })).toThrow(/Model/);
    expect(normalizeSettings({ ...base, llmBaseUrl: 'http://localhost:11434/v1' }).llmBaseUrl).toBe(
      'http://localhost:11434/v1',
    );
  });
});
