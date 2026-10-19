import { describe, expect, it } from 'vitest';
import type { KeyMoment } from '../../shared/types';
import { DiagnosisParseError, DiagnosisParser } from './DiagnosisParser';

const moment = (ply: number, speech: string | null): KeyMoment => ({
  ply,
  fenBefore: 'x',
  opponentLastSan: 'e5',
  playedSan: 'Nf3',
  bestSan: 'Bc4',
  evalBeforeCp: 30,
  evalAfterCp: -310,
  cpLoss: 340,
  speech,
});
const moments = [moment(3, 'I will just take the pawn'), moment(9, null)];

const entry = (ply: number, over: object = {}) => ({
  ply,
  label: 'no_plan',
  imbalance: null,
  diagnosis: 'You had no plan.',
  quote: null,
  ...over,
});
const reply = (ms: object[]) =>
  JSON.stringify({ moments: ms, summary: 'Summary.', habit: 'Name a plan before moving.' });

describe('DiagnosisParser', () => {
  const p = new DiagnosisParser();

  it('parses a valid reply', () => {
    const d = p.parse(reply([entry(3, { quote: 'just take the pawn' }), entry(9, { label: 'no_structure' })]), moments);
    expect(d.moments.map((m) => m.ply)).toEqual([3, 9]);
    expect(d.moments[0]!.quote).toBe('just take the pawn');
    expect(d.summary).toBe('Summary.');
    expect(d.warnings).toEqual([]);
  });

  it('accepts fenced JSON with surrounding prose', () => {
    const raw = 'Here you go:\n```json\n' + reply([entry(3), entry(9, { label: 'no_structure' })]) + '\n```';
    expect(p.parse(raw, moments).moments).toHaveLength(2);
  });

  it('forces silent moments to no_structure with no quote', () => {
    const d = p.parse(reply([entry(3), entry(9, { label: 'no_plan', quote: 'hmm' })]), moments);
    expect(d.moments[1]).toMatchObject({ label: 'no_structure', quote: null });
    expect(d.warnings!.length).toBe(1);
  });

  it('removes a quote that is not in the transcript', () => {
    const d = p.parse(reply([entry(3, { quote: 'I saw a fork' }), entry(9, { label: 'no_structure' })]), moments);
    expect(d.moments[0]!.quote).toBeNull();
    expect(d.warnings![0]).toMatch(/quote/);
  });

  it('matches quotes ignoring case and punctuation', () => {
    const d = p.parse(reply([entry(3, { quote: 'I will, just TAKE the pawn!' }), entry(9, { label: 'no_structure' })]), moments);
    expect(d.moments[0]!.quote).not.toBeNull();
  });

  it('keeps imbalance only for misjudged_imbalance', () => {
    const d = p.parse(
      reply([
        entry(3, { label: 'misjudged_imbalance', imbalance: 'space' }),
        entry(9, { label: 'no_structure', imbalance: 'files' }),
      ]),
      moments,
    );
    expect(d.moments[0]!.imbalance).toBe('space');
    expect(d.moments[1]!.imbalance).toBeNull();
  });

  it.each([
    ['not json', 'nope'],
    ['missing ply', reply([entry(3)])],
    ['duplicate ply', reply([entry(3), entry(3)])],
    ['extra ply', reply([entry(3), entry(9), entry(11)])],
    ['bad label', reply([entry(3, { label: 'great' }), entry(9)])],
    ['empty diagnosis', reply([entry(3, { diagnosis: '' }), entry(9)])],
  ])('rejects %s', (_name, raw) => {
    expect(() => p.parse(raw, moments)).toThrow(DiagnosisParseError);
  });
});
