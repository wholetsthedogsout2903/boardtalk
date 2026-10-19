export type UiState = 'idle' | 'starting' | 'recording' | 'saving' | 'save_failed' | 'error';

export interface ButtonDetail {
  message?: string;
  warning?: boolean;
  elapsedMs?: number;
}

function mmss(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function labelFor(state: UiState, d: ButtonDetail = {}): string {
  switch (state) {
    case 'idle':
      return d.message ?? 'Record thinking';
    case 'starting':
      return 'Waiting for mic…';
    case 'recording':
      return `● Recording ${mmss(d.elapsedMs ?? 0)}${d.warning ? ' (mic lost)' : ''}`;
    case 'saving':
      return 'Saving…';
    case 'save_failed':
      return 'Retry save';
    case 'error':
      return d.message ?? 'Something went wrong';
  }
}

/** One plain button in a Shadow DOM. Shows state and elapsed time only. */
export class RecordButton {
  private readonly button: HTMLButtonElement;

  constructor() {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'closed' });
    this.button = document.createElement('button');
    this.button.style.cssText =
      'position:fixed;bottom:16px;right:16px;z-index:2147483647;padding:8px 12px;' +
      'font:14px system-ui,sans-serif;border:1px solid #555;border-radius:4px;' +
      'background:#fff;color:#000;cursor:pointer;';
    shadow.appendChild(this.button);
    document.body.appendChild(host);
    this.render('idle');
  }

  render(state: UiState, detail: ButtonDetail = {}): void {
    this.button.textContent = labelFor(state, detail);
    this.button.disabled = state === 'starting' || state === 'saving';
  }

  onClick(cb: () => void): void {
    this.button.addEventListener('click', cb);
  }
}
