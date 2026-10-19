import { DEFAULT_FEEDBACK_TEMPLATE } from '../defaultTemplate';
import type { Settings } from '../types';
import type { KV } from './RecordingRepository';

export const DEFAULT_SETTINGS: Settings = {
  whisperApiKey: '',
  llmApiKey: '',
  llmBaseUrl: 'https://api.openai.com/v1',
  llmModel: 'gpt-4o-mini',
  feedbackTemplate: DEFAULT_FEEDBACK_TEMPLATE,
};

const KEY = 'settings';

/** Trims fields and validates the base URL; throws a readable Error. */
export function normalizeSettings(s: Settings): Settings {
  const baseUrl = s.llmBaseUrl.trim().replace(/\/+$/, '');
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('LLM base URL is not a valid URL.');
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error('LLM base URL must be https:// (or http://localhost).');
  }
  const model = s.llmModel.trim();
  if (!model) throw new Error('Model name is required.');
  return {
    whisperApiKey: s.whisperApiKey.trim(),
    llmApiKey: s.llmApiKey.trim(),
    llmBaseUrl: baseUrl,
    llmModel: model,
    feedbackTemplate: s.feedbackTemplate,
  };
}

/** chrome.storage.local (never sync). get() returns defaults for missing fields. */
export class SettingsRepository {
  constructor(private readonly kv: KV = chrome.storage.local) {}

  async get(): Promise<Settings> {
    const stored = (await this.kv.get(KEY))[KEY] as Partial<Settings> | undefined;
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async save(settings: Settings): Promise<void> {
    await this.kv.set({ [KEY]: normalizeSettings(settings) });
  }
}
