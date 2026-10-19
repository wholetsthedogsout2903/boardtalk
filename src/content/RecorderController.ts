import { blobToBase64 } from '../shared/base64';
import type { Message, RecordingPayload, SaveResponse } from '../shared/messages';
import type { Color } from '../shared/types';
import type { SiteAdapter } from './adapters/SiteAdapter';
import { MicDeniedError, NoMicError, UnsupportedAudioError } from './AudioRecorder';
import type { AudioRecorder } from './AudioRecorder';
import type { MoveListWatcher } from './MoveListWatcher';
import type { MoveLogger } from './MoveLogger';
import type { RecordButton, UiState } from './RecordButton';

export type Send = (m: Message) => Promise<SaveResponse | undefined>;

const defaultSend: Send = (m) => chrome.runtime.sendMessage(m);

function startErrorMessage(err: unknown): string {
  if (err instanceof MicDeniedError) return 'Microphone blocked. Allow it for this site and try again.';
  if (err instanceof NoMicError) return 'No microphone found.';
  if (err instanceof UnsupportedAudioError) return "This browser can't record Opus audio.";
  return "Couldn't start recording.";
}

/**
 * State machine: idle -> starting -> recording -> saving -> idle, with error and
 * save_failed (retry) branches. Refuses to start without a detectable board.
 * logger.begin runs after audio.start resolves, so moves already on the board
 * (or made during the permission prompt) are pre-existing (observedAt = null).
 */
export class RecorderController {
  private state: UiState = 'idle';
  private pending: RecordingPayload | null = null;
  private startedAt = 0;
  private userColor: Color = 'white';
  private micLost = false;
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly adapter: Pick<SiteAdapter, 'siteId' | 'userColor' | 'readMoves'>,
    private readonly audio: Pick<AudioRecorder, 'start' | 'stop' | 'onLost'>,
    private readonly watcher: Pick<MoveListWatcher, 'start' | 'stop'>,
    private readonly logger: Pick<MoveLogger, 'begin' | 'onSnapshot' | 'moves'>,
    private readonly button: Pick<RecordButton, 'render' | 'onClick'>,
    private readonly send: Send = defaultSend,
    private readonly now: () => number = Date.now,
  ) {
    this.audio.onLost(() => {
      this.micLost = true;
      this.renderRecording();
    });
    this.button.onClick(() => this.toggle());
    this.button.render('idle');
  }

  toggle(): void {
    switch (this.state) {
      case 'idle':
        void this.start();
        break;
      case 'recording':
        void this.stop();
        break;
      case 'save_failed':
        void this.save();
        break;
      case 'error':
        this.set('idle');
        break;
      default:
        break; // starting / saving: ignore
    }
  }

  private set(state: UiState, detail?: { message?: string }): void {
    this.state = state;
    this.button.render(state, detail);
  }

  private fail(message: string): void {
    this.set('error', { message });
    setTimeout(() => {
      if (this.state === 'error') this.set('idle');
    }, 4000);
  }

  private renderRecording(): void {
    if (this.state !== 'recording') return;
    this.button.render('recording', {
      elapsedMs: this.now() - this.startedAt,
      warning: this.micLost,
    });
  }

  private async start(): Promise<void> {
    const color = this.adapter.userColor();
    if (!color) return this.fail('Open a game first.');
    this.set('starting');
    try {
      this.startedAt = await this.audio.start();
    } catch (err) {
      console.warn('[Boardtalk] could not start recording', err);
      return this.fail(startErrorMessage(err));
    }
    this.userColor = color;
    this.micLost = false;
    const initial = this.adapter.readMoves();
    this.logger.begin(initial);
    this.watcher.start((sans, at) => this.logger.onSnapshot(sans, at));
    console.info(`[Boardtalk] recording as ${color}, ${initial.length} moves already on the board`);
    this.state = 'recording';
    this.renderRecording();
    this.ticker = setInterval(() => this.renderRecording(), 1000);
  }

  private async stop(): Promise<void> {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    this.set('saving');
    this.watcher.stop();
    let blob: Blob;
    try {
      blob = await this.audio.stop();
    } catch {
      return this.fail("Couldn't finish the recording.");
    }
    const durationMs = this.now() - this.startedAt;
    const moves = this.logger.moves();
    console.info(`[Boardtalk] stopped: ${moves.length} moves, ${blob.size} bytes of audio`);
    this.pending = {
      site: this.adapter.siteId,
      gameUrl: location.href,
      userColor: this.userColor,
      startedAt: this.startedAt,
      durationMs,
      audioMime: blob.type,
      audioBase64: await blobToBase64(blob),
      moves,
    };
    await this.save();
  }

  private async save(): Promise<void> {
    const payload = this.pending;
    if (!payload) return this.set('idle');
    this.set('saving');
    let res: SaveResponse | undefined;
    try {
      res = await this.send({ type: 'recording:save', payload });
    } catch (err) {
      console.warn('[Boardtalk] save failed', err);
      res = undefined;
    }
    if (res?.ok) {
      this.pending = null;
      this.set('idle', {
        message:
          payload.moves.length === 0
            ? 'Saved, but no moves were detected (the site layout may have changed)'
            : 'Saved',
      });
      setTimeout(() => {
        if (this.state === 'idle') this.set('idle');
      }, 3000);
    } else {
      this.set('save_failed');
    }
  }
}
