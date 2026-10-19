export class MicDeniedError extends Error {}

/**
 * getUserMedia + MediaRecorder (audio/webm;codecs=opus, 24 kbps so long games
 * stay under Whisper's 25 MB cap).
 */
export class AudioRecorder {
  /** Resolves with startedAt (epoch ms, taken in the recorder's start event). */
  start(): Promise<number> {
    throw new Error('Not implemented');
  }

  /** Stops the recorder and the mic tracks. */
  stop(): Promise<Blob> {
    throw new Error('Not implemented');
  }
}
