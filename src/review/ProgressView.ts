import type { ProgressEvent } from '../analysis/AnalysisPipeline';
import type { Stage } from '../shared/types';
import { el } from './dom';

const NAMES: Record<Stage, string> = {
  transcribe: 'Transcribe',
  evaluate: 'Evaluate',
  diagnose: 'Diagnose',
};
const ORDER: Stage[] = ['transcribe', 'evaluate', 'diagnose'];

/** One line of plain text: "Transcribe: done · Evaluate: 54/84 · Diagnose: waiting". */
export class ProgressView {
  readonly element = el('p');
  private status = new Map<Stage, string>();

  constructor() {
    this.reset();
  }

  reset(): void {
    this.status = new Map(ORDER.map((s) => [s, 'waiting']));
    this.paint();
  }

  update(e: ProgressEvent): void {
    const text =
      e.status === 'running' && e.done !== undefined && e.total !== undefined
        ? `${e.done}/${e.total}`
        : e.status;
    this.status.set(e.stage, text);
    this.paint();
  }

  private paint(): void {
    this.element.textContent = ORDER.map((s) => `${NAMES[s]}: ${this.status.get(s)}`).join(' · ');
  }
}
