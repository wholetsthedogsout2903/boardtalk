import { describe, expect, it } from 'vitest';
import type { KeyMoment } from '../../shared/types';
import { PromptBuilder } from './PromptBuilder';

const m = (speech: string | null): KeyMoment => ({
  ply: 27,
  fenBefore: 'fen',
  opponentLastSan: 'Bg4',
  playedSan: 'Nxe5',
  bestSan: 'Qd2',
  evalBeforeCp: 30,
  evalAfterCp: -310,
  cpLoss: 340,
  speech,
});

describe('PromptBuilder', () => {
  const b = new PromptBuilder();

  it('puts the fixed contract after the editable template', () => {
    const { system } = b.build('MY TEMPLATE TEXT', 'white', [m('hi')]);
    expect(system.indexOf('MY TEMPLATE TEXT')).toBeGreaterThan(system.indexOf('Rules:'));
    expect(system.indexOf('Allowed labels')).toBeGreaterThan(system.indexOf('MY TEMPLATE TEXT'));
  });

  it('serialises moments as data with null for silent moves', () => {
    const { human } = b.build('t', 'black', [m(null), m('I take it')]);
    const data = JSON.parse(human);
    expect(data.playerColor).toBe('black');
    expect(data.moments[0]).toMatchObject({
      ply: 27,
      moveNumber: 14,
      opponentLastMove: 'Bg4',
      movePlayed: 'Nxe5',
      engineBestMove: 'Qd2',
      evalBeforePawns: 0.3,
      evalAfterPawns: -3.1,
      transcript_verbatim: null,
    });
    expect(data.moments[1].transcript_verbatim).toBe('I take it');
  });

  it('still works with an empty template', () => {
    expect(b.build('', 'white', [m('x')]).system).toContain('Allowed labels');
  });
});
