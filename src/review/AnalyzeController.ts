import type { AnalysisPipeline } from '../analysis/AnalysisPipeline';
import type { RecordingRepository } from '../shared/storage/RecordingRepository';
import type { SettingsRepository } from '../shared/storage/SettingsRepository';
import type { Settings } from '../shared/types';
import { el } from './dom';
import type { ProgressView } from './ProgressView';
import type { ReviewView } from './ReviewView';
import type { SettingsPanel } from './SettingsPanel';

export interface ControllerDeps {
  root: HTMLElement;
  repo: Pick<RecordingRepository, 'get'>;
  settingsRepo: Pick<SettingsRepository, 'get'>;
  settingsPanel: SettingsPanel;
  progress: ProgressView;
  view: ReviewView;
  createPipeline: (settings: Settings) => Pick<AnalysisPipeline, 'run'>;
}

/** Loads the recording and wires Analyze / Re-diagnose to the pipeline. */
export class AnalyzeController {
  private readonly analyzeBtn = el('button', { text: 'Analyze', attrs: { type: 'button' } });
  private readonly rediagnoseBtn = el('button', {
    text: 'Re-diagnose',
    attrs: { type: 'button', hidden: '' },
  });
  private id = '';

  constructor(private readonly d: ControllerDeps) {}

  async init(id: string | null): Promise<void> {
    const { root, view } = this.d;
    root.append(el('h1', { text: 'Boardtalk' }));
    if (!id) {
      root.append(view.element);
      view.showMessage('No recordings yet. Record a game on chess.com or lichess.org first.');
      return;
    }
    const rec = await this.d.repo.get(id);
    if (!rec) {
      root.append(view.element);
      view.showMessage('Recording not found.');
      return;
    }
    this.id = id;
    await this.d.settingsPanel.load();
    root.append(
      view.header(rec),
      this.d.settingsPanel.element,
      el('p', {}, [this.analyzeBtn, ' ', this.rediagnoseBtn]),
      this.d.progress.element,
      view.element,
    );
    this.analyzeBtn.addEventListener('click', () => void this.run());
    this.rediagnoseBtn.addEventListener('click', () => void this.run('diagnosis'));
    const a = rec.analysis;
    if (a.transcript && a.evals && a.diagnosis) void this.run(); // fully cached: no API calls
  }

  private async run(redo?: 'diagnosis'): Promise<void> {
    const { view, progress } = this.d;
    this.analyzeBtn.disabled = true;
    this.rediagnoseBtn.disabled = true;
    progress.reset();
    view.showMessage('Analyzing… keep this tab open.');
    try {
      const settings = await this.d.settingsRepo.get();
      const result = await this.d.createPipeline(settings).run(
        this.id,
        (e) => progress.update(e),
        redo ? { redo } : {},
      );
      view.render(result);
      this.rediagnoseBtn.hidden = result.summary === null;
    } catch (err) {
      view.showError(err);
    } finally {
      this.analyzeBtn.disabled = false;
      this.rediagnoseBtn.disabled = false;
    }
  }
}
