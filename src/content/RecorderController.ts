import type { RecordingPayload } from '../shared/messages';
import type { SiteAdapter } from './adapters/SiteAdapter';
import { AudioRecorder } from './AudioRecorder';
import { MoveListWatcher } from './MoveListWatcher';
import { MoveLogger } from './MoveLogger';
import { RecordButton, type UiState } from './RecordButton';

/**
 * State machine: idle -> starting -> recording -> saving -> idle
 * (error / save_failed with retry). Refuses to start if adapter.userColor()
 * is null. Keeps the payload in `pending` if saving fails.
 */
export class RecorderController {
  private state: UiState = 'idle';
  private pending: RecordingPayload | null = null;

  constructor(
    private readonly adapter: SiteAdapter,
    private readonly audio: AudioRecorder,
    private readonly watcher: MoveListWatcher,
    private readonly logger: MoveLogger,
    private readonly button: RecordButton,
  ) {}

  toggle(): void {
    throw new Error('Not implemented');
  }
}
