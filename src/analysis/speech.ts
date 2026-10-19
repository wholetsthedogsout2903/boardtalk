import type { TranscriptSegment } from '../shared/types';

export const NO_SPEECH_THRESHOLD = 0.6;

/** Drops segments Whisper likely hallucinated on silence. */
export function dropNonSpeech(_segments: TranscriptSegment[]): TranscriptSegment[] {
  throw new Error('Not implemented');
}
