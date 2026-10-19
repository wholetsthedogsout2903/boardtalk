import type { RecordingPayload } from '../messages';
import type { AnalysisCache, Recording } from '../types';

/**
 * chrome.storage.local keys: rec:{id}, audio:{id} (base64), recIndex.
 */
export class RecordingRepository {
  save(_payload: RecordingPayload): Promise<string> {
    throw new Error('Not implemented');
  }

  get(_id: string): Promise<Recording | null> {
    throw new Error('Not implemented');
  }

  getAudio(_id: string): Promise<Blob> {
    throw new Error('Not implemented');
  }

  latestId(): Promise<string | null> {
    throw new Error('Not implemented');
  }

  saveStage<K extends keyof AnalysisCache>(
    _id: string,
    _stage: K,
    _data: NonNullable<AnalysisCache[K]>,
  ): Promise<void> {
    throw new Error('Not implemented');
  }
}
