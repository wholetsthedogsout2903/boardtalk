export type UiState = 'idle' | 'starting' | 'recording' | 'saving' | 'save_failed' | 'error';

/** Fixed-position button in a Shadow DOM. No analysis UI of any kind. */
export class RecordButton {
  render(_state: UiState): void {
    throw new Error('Not implemented');
  }

  onClick(_cb: () => void): void {
    throw new Error('Not implemented');
  }
}
