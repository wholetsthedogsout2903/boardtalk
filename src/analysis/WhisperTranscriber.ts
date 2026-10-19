import type { TranscriptSegment } from '../shared/types';
import type { Transcriber } from './AnalysisPipeline';
import { WHISPER_MAX_BYTES, WHISPER_URL } from './config';
import { AnalysisError } from './errors';

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  no_speech_prob: number;
}

/** whisper-1, verbose_json: returns raw timestamped segments (unfiltered). */
export class WhisperTranscriber implements Transcriber {
  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = (...args) => fetch(...args),
  ) {}

  async transcribe(audio: Blob): Promise<TranscriptSegment[]> {
    if (!this.apiKey) {
      throw new AnalysisError('transcribe', 'config', 'The Whisper API key is missing.');
    }
    if (audio.size > WHISPER_MAX_BYTES) {
      throw new AnalysisError('transcribe', 'too_large', 'Audio is over 25 MB; Whisper cannot take it.');
    }
    const form = new FormData();
    form.append('file', audio, 'audio.webm');
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');

    let res: Response;
    try {
      res = await this.fetchFn(WHISPER_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(10 * 60_000),
      });
    } catch (err) {
      throw new AnalysisError('transcribe', 'network', `Whisper request failed (${String(err)}).`);
    }
    if (res.status === 401 || res.status === 403) {
      throw new AnalysisError('transcribe', 'auth', 'Whisper rejected the API key.');
    }
    if (res.status === 413) {
      throw new AnalysisError('transcribe', 'too_large', 'Audio is too large for Whisper.');
    }
    if (!res.ok) {
      throw new AnalysisError('transcribe', 'network', `Whisper request failed (HTTP ${res.status}).`);
    }
    let body: { segments?: WhisperSegment[] };
    try {
      body = (await res.json()) as { segments?: WhisperSegment[] };
    } catch {
      throw new AnalysisError('transcribe', 'network', 'Whisper returned an unreadable response.');
    }
    return (body.segments ?? [])
      .map((s) => ({
        start: s.start,
        end: s.end,
        text: s.text.trim(),
        noSpeechProb: s.no_speech_prob,
      }))
      .filter((s) => s.text.length > 0);
  }
}
