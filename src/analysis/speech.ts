import type { TranscriptSegment } from '../shared/types';
import { NO_SPEECH_THRESHOLD } from './config';

/** Drops segments Whisper likely hallucinated on silence. */
export function dropNonSpeech(
  segments: TranscriptSegment[],
  threshold: number = NO_SPEECH_THRESHOLD,
): TranscriptSegment[] {
  return segments.filter((s) => s.noSpeechProb <= threshold && s.text.trim().length > 0);
}
