import { describe, expect, it } from 'vitest';
import { dropNonSpeech } from './speech';

const seg = (noSpeechProb: number, text = 'hello') => ({ start: 0, end: 1, text, noSpeechProb });

describe('dropNonSpeech', () => {
  it('keeps segments at the threshold and drops above it', () => {
    expect(dropNonSpeech([seg(0.6), seg(0.61)])).toEqual([seg(0.6)]);
  });
  it('drops empty text', () => {
    expect(dropNonSpeech([seg(0, '   ')])).toEqual([]);
  });
  it('accepts a custom threshold', () => {
    expect(dropNonSpeech([seg(0.3)], 0.2)).toEqual([]);
  });
});
