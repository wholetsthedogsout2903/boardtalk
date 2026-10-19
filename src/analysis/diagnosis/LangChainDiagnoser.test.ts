import { describe, expect, it, vi } from 'vitest';
import type { KeyMoment } from '../../shared/types';
import { AnalysisError } from '../errors';
import { DiagnosisParser } from './DiagnosisParser';
import { LangChainDiagnoser } from './LangChainDiagnoser';
import type { ChatModel, DiagnoserConfig } from './LangChainDiagnoser';
import { PromptBuilder } from './PromptBuilder';

const cfg: DiagnoserConfig = { apiKey: 'k', baseUrl: 'https://llm.test/v1', model: 'm', template: 'T' };
const moments: KeyMoment[] = [
  { ply: 3, fenBefore: 'f', opponentLastSan: 'e5', playedSan: 'Nf3', bestSan: 'Bc4', evalBeforeCp: 30, evalAfterCp: -310, cpLoss: 340, speech: 'I just develop' },
];
const good = JSON.stringify({
  moments: [{ ply: 3, label: 'no_plan', imbalance: null, diagnosis: 'No plan.', quote: 'I just develop' }],
  summary: 'S.',
  habit: 'H.',
});

function model(replies: Array<string | Error>): ChatModel & { calls: number; lastMessages: unknown[] } {
  const m = {
    calls: 0,
    lastMessages: [] as unknown[],
    invoke: vi.fn(async (messages: unknown[]) => {
      m.lastMessages = messages;
      const r = replies[m.calls++]!;
      if (r instanceof Error) throw r;
      return { content: r };
    }),
  };
  return m as never;
}
const make = (m: ChatModel, c = cfg) => new LangChainDiagnoser(c, new PromptBuilder(), new DiagnosisParser(), () => m);

describe('LangChainDiagnoser', () => {
  it('returns the parsed diagnosis on the first valid reply', async () => {
    const m = model([good]);
    const d = await make(m).diagnose(moments, 'white');
    expect(d.moments[0]!.label).toBe('no_plan');
    expect(m.calls).toBe(1);
  });

  it('retries once with the rejection reason', async () => {
    const m = model(['not json', good]);
    const d = await make(m).diagnose(moments, 'white');
    expect(d.summary).toBe('S.');
    expect(m.calls).toBe(2);
    expect(JSON.stringify(m.lastMessages)).toContain('Your reply was invalid');
  });

  it('fails with a parse error carrying a raw excerpt after two bad replies', async () => {
    const err = await make(model(['bad one', 'bad two'])).diagnose(moments, 'white').catch((e) => e);
    expect(err).toBeInstanceOf(AnalysisError);
    expect(err).toMatchObject({ kind: 'parse', stage: 'diagnose', detail: 'bad two' });
  });

  it('requires configuration', async () => {
    const err = await make(model([good]), { ...cfg, apiKey: '' }).diagnose(moments, 'white').catch((e) => e);
    expect(err).toMatchObject({ kind: 'config' });
  });

  it('maps 401 to auth and other failures to network', async () => {
    const auth = await make(model([Object.assign(new Error('x'), { status: 401 })])).diagnose(moments, 'white').catch((e) => e);
    expect(auth).toMatchObject({ kind: 'auth' });
    const net = await make(model([new Error('Failed to fetch')])).diagnose(moments, 'white').catch((e) => e);
    expect(net).toMatchObject({ kind: 'network' });
  });
});
