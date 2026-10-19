import { AnalysisError } from '../analysis/errors';
import type { Recording, ReviewResult } from '../shared/types';
import { el } from './dom';
import { formatDuration, formatEvalChange, moveHeading, siteName } from './format';
import { labelText } from './labels';

const KIND_REMEDY: Record<string, string> = {
  config: 'Open Settings and fill in the missing value.',
  auth: 'Check the API key in Settings.',
  too_large: 'This recording is too long for Whisper. Record a shorter game.',
  network: 'Check your connection and click Analyze to retry; finished stages are kept.',
  permission: 'Open Settings and click Save to grant access to the LLM host.',
  parse: 'Click Analyze to retry the diagnosis; finished stages are kept.',
  engine: 'Reload this page and try again.',
  unsupported: 'Only standard chess is supported.',
};

/** Plain HTML: headings, paragraphs, definition lists. Text only, never innerHTML. */
export class ReviewView {
  readonly element = el('div');

  clear(): void {
    this.element.replaceChildren();
  }

  header(rec: Recording): HTMLElement {
    return el('p', {
      text: [
        siteName(rec.site),
        new Date(rec.createdAt).toLocaleString(),
        `${rec.moves.length} moves recorded`,
        formatDuration(rec.durationMs),
      ].join(' · '),
    });
  }

  render(r: ReviewResult): void {
    this.clear();
    const out: Array<HTMLElement> = [];

    if (r.warnings.length > 0) {
      out.push(el('h2', { text: 'Notes' }), el('ul', {}, r.warnings.map((w) => el('li', { text: w }))));
    }
    out.push(
      el('h2', { text: 'Summary' }),
      el('p', { text: `Silent on ${r.silentCount} of ${r.userMoveCount} of your moves.` }),
    );
    if (r.summary) out.push(el('p', { text: r.summary }));
    if (r.habit) out.push(el('h2', { text: 'Habit to practise' }), el('p', { text: r.habit }));

    out.push(el('h2', { text: 'Key moments' }));
    if (r.moments.length === 0) {
      out.push(el('p', { text: 'No move lost 1.0 or more in a position that was still undecided.' }));
    }
    for (const m of r.moments) {
      out.push(
        el('h3', { text: moveHeading(m.ply, m.playedSan) }),
        el('dl', {}, [
          el('dt', { text: 'Eval' }),
          el('dd', { text: formatEvalChange(m.evalBeforeCp, m.evalAfterCp) }),
          el('dt', { text: 'Label' }),
          el('dd', { text: labelText(m.label, m.imbalance) }),
          el('dt', { text: 'You said' }),
          el('dd', { text: m.speech ?? '(silent)' }),
          ...(m.quote ? [el('dt', { text: 'Evidence' }), el('dd', { text: `"${m.quote}"` })] : []),
          el('dt', { text: 'Diagnosis' }),
          el('dd', { text: m.diagnosis }),
          el('dt', { text: 'Engine preferred' }),
          el('dd', { text: m.bestSan }),
        ]),
      );
    }
    this.element.append(...out);
  }

  showError(err: unknown): void {
    this.clear();
    const message = err instanceof Error ? err.message : String(err);
    const nodes: HTMLElement[] = [el('h2', { text: 'Analysis failed' }), el('p', { text: message })];
    if (err instanceof AnalysisError) {
      const remedy = KIND_REMEDY[err.kind];
      if (remedy) nodes.push(el('p', { text: remedy }));
      if (err.detail) {
        nodes.push(
          el('details', {}, [el('summary', { text: 'Raw reply (excerpt)' }), el('pre', { text: err.detail })]),
        );
      }
    }
    this.element.append(...nodes);
  }

  showMessage(text: string): void {
    this.clear();
    this.element.append(el('p', { text }));
  }
}
