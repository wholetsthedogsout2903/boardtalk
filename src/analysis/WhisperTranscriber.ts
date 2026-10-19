import type { TranscriptSegment } from '../shared/types';
import type { Transcriber } from './AnalysisPipeline';

/**
 * POST /v1/audio/transcriptions, model=whisper-1, response_format=verbose_json.
 * Fails fast if the audio is over 25 MB.
 */
export class WhisperTranscriber implements Transcriber {
  constructor(private readonly apiKey: string) {}

  transcribe(_audio: Blob): Promise<TranscriptSegment[]> {
    throw new Error('Not implemented');
  }
}
