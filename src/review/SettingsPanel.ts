import type { Settings } from '../shared/types';
import { DEFAULT_FEEDBACK_TEMPLATE } from '../shared/defaultTemplate';
import { normalizeSettings } from '../shared/storage/SettingsRepository';
import type { SettingsRepository } from '../shared/storage/SettingsRepository';
import { el } from './dom';

type Field = keyof Settings;

/**
 * A plain <form> inside <details>. Save normalises and stores the settings, then
 * asks for permission to reach the LLM host (api.openai.com is already granted).
 */
export class SettingsPanel {
  readonly element: HTMLElement;
  private readonly inputs = new Map<Field, HTMLInputElement | HTMLTextAreaElement>();
  private readonly message = el('p');

  constructor(
    private readonly repo: Pick<SettingsRepository, 'get' | 'save'>,
    private readonly requestOrigin: (origin: string) => Promise<boolean> = defaultRequest,
  ) {
    const row = (field: Field, label: string, input: HTMLInputElement | HTMLTextAreaElement) => {
      this.inputs.set(field, input);
      return el('p', {}, [el('label', { text: `${label} ` }), input]);
    };
    const text = (type: string) => el('input', { attrs: { type, size: '50' } });
    const template = el('textarea', { attrs: { rows: '14', cols: '70' } });
    const reset = el('button', { text: 'Reset template to default', attrs: { type: 'button' } });
    reset.addEventListener('click', () => {
      template.value = DEFAULT_FEEDBACK_TEMPLATE;
    });
    const save = el('button', { text: 'Save settings', attrs: { type: 'submit' } });
    const form = el('form', {}, [
      row('whisperApiKey', 'Whisper (OpenAI) API key', text('password')),
      row('llmApiKey', 'LLM API key', text('password')),
      row('llmBaseUrl', 'LLM base URL', text('text')),
      row('llmModel', 'Model name', text('text')),
      row('feedbackTemplate', 'Feedback template', template),
      el('p', {}, [reset]),
      el('p', {}, [save]),
      this.message,
    ]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void this.onSave();
    });
    this.element = el('details', {}, [el('summary', { text: 'Settings' }), form]);
  }

  async load(): Promise<Settings> {
    const s = await this.repo.get();
    for (const [field, input] of this.inputs) input.value = s[field];
    return s;
  }

  async onSave(): Promise<void> {
    try {
      const raw = Object.fromEntries(
        [...this.inputs].map(([f, i]) => [f, i.value]),
      ) as unknown as Settings;
      const clean = normalizeSettings(raw);
      await this.repo.save(clean);
      const origin = new URL(clean.llmBaseUrl).origin;
      const granted = origin === 'https://api.openai.com' || (await this.requestOrigin(origin));
      this.message.textContent = granted
        ? 'Saved.'
        : `Saved, but Boardtalk can't reach ${origin} without permission. Click Save again to grant it.`;
    } catch (err) {
      this.message.textContent = err instanceof Error ? err.message : String(err);
    }
  }
}

function defaultRequest(origin: string): Promise<boolean> {
  return chrome.permissions.request({ origins: [`${origin}/*`] });
}
