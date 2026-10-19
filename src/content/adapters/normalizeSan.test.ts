import { describe, expect, it } from 'vitest';
import { normalizeSan } from './normalizeSan';

describe('normalizeSan', () => {
  it.each([
    ['Nf3', 'Nf3'],
    ['♘f3', 'Nf3'],
    ['♞c6', 'Nc6'],
    ['0-0', 'O-O'],
    ['0-0-0', 'O-O-O'],
    ['O-O', 'O-O'],
    ['e4!?', 'e4'],
    ['Nf3??', 'Nf3'],
    ['e8=Q+', 'e8=Q+'],
    ['Qxe7#', 'Qxe7#'],
    ['exd5', 'exd5'],
    ['R1a3', 'R1a3'],
    [' Nf3 ', 'Nf3'],
    ['N f3', 'Nf3'],
  ])('keeps %s as %s', (raw, want) => {
    expect(normalizeSan(raw)).toBe(want);
  });

  it.each(['12.', '12…', '1-0', '0-1', '1/2-1/2', '*', '5:00', '+0.3', 'White resigned', ''])(
    'rejects %j',
    (raw) => {
      expect(normalizeSan(raw)).toBeNull();
    },
  );
});
