import type { Settings } from '../types';

/** chrome.storage.local (never sync). get() returns defaults when empty. */
export class SettingsRepository {
  get(): Promise<Settings> {
    throw new Error('Not implemented');
  }

  save(_settings: Settings): Promise<void> {
    throw new Error('Not implemented');
  }
}
