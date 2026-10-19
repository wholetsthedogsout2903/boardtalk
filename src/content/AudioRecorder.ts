export class MicDeniedError extends Error {}
export class NoMicError extends Error {}
export class UnsupportedAudioError extends Error {}

const MIME = 'audio/webm;codecs=opus';
// 24 kbps keeps ~2 hours under Whisper's 25 MB upload cap.
const BITS_PER_SECOND = 24000;
const TIMESLICE_MS = 10_000;

/** getUserMedia + MediaRecorder. One instance can record repeatedly. */
export class AudioRecorder {
  private recorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private stopped: Promise<Blob> | null = null;
  private lostCb: (() => void) | null = null;

  onLost(cb: () => void): void {
    this.lostCb = cb;
  }

  /** Resolves with startedAt (epoch ms), taken in the recorder's start event. */
  async start(): Promise<number> {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(MIME)) {
      throw new UnsupportedAudioError('Opus audio recording is not supported');
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, noiseSuppression: true, echoCancellation: true },
      });
    } catch (err) {
      const name = (err as DOMException).name;
      if (name === 'NotAllowedError' || name === 'SecurityError') throw new MicDeniedError(name);
      if (name === 'NotFoundError') throw new NoMicError(name);
      throw err;
    }
    this.stream = stream;
    this.chunks = [];
    this.stopped = null;
    const recorder = new MediaRecorder(stream, {
      mimeType: MIME,
      audioBitsPerSecond: BITS_PER_SECOND,
    });
    this.recorder = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    stream.getAudioTracks().forEach((t) => {
      t.onended = () => this.lostCb?.();
    });
    return new Promise<number>((resolve, reject) => {
      recorder.onstart = () => resolve(Date.now());
      recorder.onerror = () => reject(new Error('MediaRecorder error'));
      recorder.start(TIMESLICE_MS);
    });
  }

  /** Stops the recorder and the mic tracks, resolves with the audio. */
  stop(): Promise<Blob> {
    if (this.stopped) return this.stopped;
    const recorder = this.recorder;
    if (!recorder) return Promise.reject(new Error('Recorder was never started'));
    this.stopped = new Promise<Blob>((resolve) => {
      const finish = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        resolve(new Blob(this.chunks, { type: MIME }));
      };
      if (recorder.state === 'inactive') {
        finish();
      } else {
        recorder.onstop = finish;
        recorder.stop();
      }
    });
    return this.stopped;
  }
}
