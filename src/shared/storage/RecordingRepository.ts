import { base64ToBlob } from '../base64';
import type { RecordingPayload } from '../messages';
import type { AnalysisCache, Recording, RecordingMeta } from '../types';

/** The slice of chrome.storage.local we use; injectable for tests. */
export interface KV {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

const STAGES = ['transcript', 'evals', 'diagnosis'] as const;
const recKey = (id: string) => `rec:${id}`;
const audioKey = (id: string) => `audio:${id}`;
const stageKey = (id: string, stage: string) => `analysis:${id}:${stage}`;
const INDEX = 'recIndex';

/**
 * Keys: rec:{id} (meta + moves), audio:{id} (base64), analysis:{id}:{stage}
 * (one key per stage so parallel stages can't overwrite each other), recIndex.
 */
export class RecordingRepository {
  constructor(private readonly kv: KV = chrome.storage.local) {}

  async save(payload: RecordingPayload): Promise<string> {
    const id = crypto.randomUUID();
    const { audioBase64, ...rest } = payload;
    const meta: RecordingMeta = { id, ...rest, createdAt: Date.now() };
    // Order: audio, meta, index. A crash never leaves an index entry without data.
    await this.kv.set({ [audioKey(id)]: audioBase64 });
    await this.kv.set({ [recKey(id)]: meta });
    const index = ((await this.kv.get(INDEX))[INDEX] as string[] | undefined) ?? [];
    await this.kv.set({ [INDEX]: [...index, id] });
    return id;
  }

  async get(id: string): Promise<Recording | null> {
    const keys = [recKey(id), ...STAGES.map((s) => stageKey(id, s))];
    const data = await this.kv.get(keys);
    const meta = data[recKey(id)] as RecordingMeta | undefined;
    if (!meta) return null;
    const analysis: AnalysisCache = {};
    for (const s of STAGES) {
      const v = data[stageKey(id, s)];
      if (v !== undefined) (analysis as Record<string, unknown>)[s] = v;
    }
    return { ...meta, analysis };
  }

  async getAudio(id: string): Promise<Blob> {
    const data = await this.kv.get([recKey(id), audioKey(id)]);
    const meta = data[recKey(id)] as RecordingMeta | undefined;
    const b64 = data[audioKey(id)] as string | undefined;
    if (!meta || !b64) throw new Error('Audio not found for this recording');
    return base64ToBlob(b64, meta.audioMime);
  }

  async latestId(): Promise<string | null> {
    const index = ((await this.kv.get(INDEX))[INDEX] as string[] | undefined) ?? [];
    return index[index.length - 1] ?? null;
  }

  async saveStage<K extends keyof AnalysisCache>(
    id: string,
    stage: K,
    data: NonNullable<AnalysisCache[K]>,
  ): Promise<void> {
    await this.kv.set({ [stageKey(id, stage)]: data });
  }
}
