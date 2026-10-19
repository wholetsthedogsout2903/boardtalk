import { describe, expect, it, vi } from 'vitest';
import { AnalysisError } from './errors';
import { WhisperTranscriber } from './WhisperTranscriber';

const blob = new Blob(['audio'], { type: 'audio/webm' });
const ok = (segments: object[]) =>
  Promise.resolve(new Response(JSON.stringify({ segments }), { status: 200 }));

async function kindOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return (e as AnalysisError).kind;
  }
  return 'none';
}

describe('WhisperTranscriber', () => {
  it('maps verbose_json segments and sends the right request', async () => {
    const fetchFn = vi.fn((_url: RequestInfo | URL, _init?: RequestInit) =>
      ok([
        { start: 1.5, end: 3, text: ' hello there ', no_speech_prob: 0.1 },
        { start: 4, end: 5, text: '   ', no_speech_prob: 0.9 },
      ]),
    );
    const t = new WhisperTranscriber('sk-test', fetchFn as unknown as typeof fetch);
    const out = await t.transcribe(blob);
    expect(out).toEqual([{ start: 1.5, end: 3, text: 'hello there', noSpeechProb: 0.1 }]);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(String(url)).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
    const form = init!.body as FormData;
    expect(form.get('model')).toBe('whisper-1');
    expect(form.get('response_format')).toBe('verbose_json');
    expect(form.get('file')).toBeInstanceOf(Blob);
  });

  it('requires a key', async () => {
    expect(await kindOf(new WhisperTranscriber('').transcribe(blob))).toBe('config');
  });

  it('rejects oversize audio before uploading', async () => {
    const fetchFn = vi.fn();
    const big = new Blob([new Uint8Array(26 * 1024 * 1024)]);
    const t = new WhisperTranscriber('k', fetchFn as unknown as typeof fetch);
    expect(await kindOf(t.transcribe(big))).toBe('too_large');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    [401, 'auth'],
    [403, 'auth'],
    [413, 'too_large'],
    [429, 'network'],
    [500, 'network'],
  ])('maps HTTP %i to %s', async (status, kind) => {
    const fetchFn = () => Promise.resolve(new Response('x', { status }));
    const t = new WhisperTranscriber('k', fetchFn as unknown as typeof fetch);
    expect(await kindOf(t.transcribe(blob))).toBe(kind);
  });

  it('maps a thrown fetch to network', async () => {
    const t = new WhisperTranscriber('k', (() => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch);
    expect(await kindOf(t.transcribe(blob))).toBe('network');
  });
});
