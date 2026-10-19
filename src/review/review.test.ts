// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import type { AnalysisPipeline } from '../analysis/AnalysisPipeline';
import { AnalysisError } from '../analysis/errors';
import type { Recording, ReviewResult } from '../shared/types';
import { AnalyzeController } from './AnalyzeController';
import { formatEval, formatEvalChange, moveHeading } from './format';
import { ProgressView } from './ProgressView';
import { ReviewView } from './ReviewView';

const result = (over: Partial<ReviewResult> = {}): ReviewResult => ({
  userMoveCount: 21,
  silentCount: 11,
  summary: 'You move fast.',
  habit: 'Name a plan.',
  warnings: [],
  moments: [
    {
      ply: 28,
      fenBefore: 'f',
      opponentLastSan: 'Bg4',
      playedSan: 'Nxe5',
      bestSan: 'Qd2',
      evalBeforeCp: 30,
      evalAfterCp: -310,
      cpLoss: 340,
      speech: "I'll just take the pawn",
      label: 'misjudged_imbalance',
      imbalance: 'weak_squares',
      diagnosis: 'You ignored the weak e5 square.',
      quote: 'just take the pawn',
    },
  ],
  ...over,
});

describe('format', () => {
  it('formats move headings and evals', () => {
    expect(moveHeading(27, 'Nxe5')).toBe('14. Nxe5');
    expect(moveHeading(28, 'Nf6')).toBe('14… Nf6');
    expect(formatEval(30)).toBe('+0.3');
    expect(formatEval(-310)).toBe('−3.1');
    expect(formatEval(0)).toBe('0.0');
    expect(formatEvalChange(30, -310)).toBe('+0.3 → −3.1 (−3.4)');
  });
});

describe('ReviewView', () => {
  it('renders the summary, silence line and key moment as text', () => {
    const v = new ReviewView();
    v.render(result());
    const t = v.element.textContent!;
    expect(t).toContain('Silent on 11 of 21 of your moves.');
    expect(t).toContain('You move fast.');
    expect(t).toContain('14… Nxe5');
    expect(t).toContain('Misjudged imbalance: weak squares');
    expect(t).toContain('+0.3 → −3.1 (−3.4)');
    expect(t).toContain('Qd2');
    expect(v.element.querySelectorAll('h3')).toHaveLength(1);
  });

  it('shows (silent) and the no-moments message', () => {
    const v = new ReviewView();
    v.render(result({ moments: [{ ...result().moments[0]!, speech: null, quote: null }] }));
    expect(v.element.textContent).toContain('(silent)');
    v.render(result({ moments: [], summary: null, habit: null }));
    expect(v.element.textContent).toContain('No move lost 1.0 or more');
  });

  it('never turns model or transcript text into HTML', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const base = result().moments[0]!;
    const v = new ReviewView();
    v.render(result({ summary: evil, moments: [{ ...base, speech: evil, diagnosis: evil, quote: evil }], warnings: [evil] }));
    expect(v.element.querySelector('img')).toBeNull();
    expect(v.element.textContent).toContain(evil);
  });

  it('shows errors with a remedy and a raw excerpt as text', () => {
    const v = new ReviewView();
    v.showError(new AnalysisError('diagnose', 'parse', 'bad reply', '<b>raw</b>'));
    expect(v.element.textContent).toContain('bad reply');
    expect(v.element.textContent).toContain('retry the diagnosis');
    expect(v.element.querySelector('b')).toBeNull();
    expect(v.element.querySelector('pre')!.textContent).toBe('<b>raw</b>');
  });
});

describe('ProgressView', () => {
  it('shows one line of plain text', () => {
    const p = new ProgressView();
    expect(p.element.textContent).toBe('Transcribe: waiting · Evaluate: waiting · Diagnose: waiting');
    p.update({ stage: 'transcribe', status: 'done' });
    p.update({ stage: 'evaluate', status: 'running', done: 54, total: 84 });
    expect(p.element.textContent).toBe('Transcribe: done · Evaluate: 54/84 · Diagnose: waiting');
  });
});

describe('AnalyzeController', () => {
  const rec = {
    id: 'r1',
    site: 'lichess',
    userColor: 'white',
    moves: [],
    durationMs: 65_000,
    createdAt: 0,
    analysis: {},
  } as unknown as Recording;

  function build(run: ReturnType<typeof vi.fn>, recording: Recording | null = rec) {
    const root = document.createElement('div');
    const settingsPanel = { element: document.createElement('details'), load: vi.fn(async () => ({})) };
    const controller = new AnalyzeController({
      root,
      repo: { get: vi.fn(async () => recording) },
      settingsRepo: { get: vi.fn(async () => ({}) as never) },
      settingsPanel: settingsPanel as never,
      progress: new ProgressView(),
      view: new ReviewView(),
      createPipeline: () => ({ run: run as unknown as AnalysisPipeline['run'] }),
    });
    return { root, controller };
  }

  it('runs the pipeline on Analyze and renders the result', async () => {
    const run = vi.fn(async () => result());
    const { root, controller } = build(run);
    await controller.init('r1');
    expect(run).not.toHaveBeenCalled();
    root.querySelector('button')!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(run).toHaveBeenCalledWith('r1', expect.any(Function), {});
    expect(root.textContent).toContain('You move fast.');
  });

  it('shows pipeline errors', async () => {
    const run = vi.fn(async () => {
      throw new AnalysisError('transcribe', 'auth', 'Whisper rejected the API key.');
    });
    const { root, controller } = build(run);
    await controller.init('r1');
    root.querySelector('button')!.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(root.textContent).toContain('Whisper rejected the API key.');
  });

  it('auto-renders a fully cached recording without a click', async () => {
    const run = vi.fn(async () => result());
    const cached = { ...rec, analysis: { transcript: [], evals: [], diagnosis: {} } } as unknown as Recording;
    const { root, controller } = build(run, cached);
    await controller.init('r1');
    await new Promise((r) => setTimeout(r, 0));
    expect(run).toHaveBeenCalledTimes(1);
    expect(root.textContent).toContain('You move fast.');
  });

  it('handles a missing id and a missing recording', async () => {
    const a = build(vi.fn());
    await a.controller.init(null);
    expect(a.root.textContent).toContain('No recordings yet');
    const b = build(vi.fn(), null);
    await b.controller.init('x');
    expect(b.root.textContent).toContain('Recording not found');
  });
});
