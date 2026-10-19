import { describe, expect, it } from 'vitest';
import { PositionBuilder } from './PositionBuilder';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('PositionBuilder', () => {
  const b = new PositionBuilder();

  it('builds the start position plus one per move', () => {
    const { positions, illegalAtPly } = b.build(['e4', 'e5', 'Nf3']);
    expect(illegalAtPly).toBeNull();
    expect(positions).toHaveLength(4);
    expect(positions[0]).toEqual({ ply: 0, fen: START, lastSan: null, terminal: null });
    expect(positions[3]).toMatchObject({ ply: 3, lastSan: 'Nf3', terminal: null });
    expect(positions[3]!.fen.split(' ')[1]).toBe('b');
  });

  it('uses canonical SAN from chess.js', () => {
    const { positions } = b.build(['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7']); // recorded without "#"
    expect(positions[7]!.lastSan).toBe('Qxf7#');
    expect(positions[7]!.terminal).toBe('mate');
  });

  it('stops at the first illegal move', () => {
    const { positions, illegalAtPly } = b.build(['e4', 'e4', 'Nf3']);
    expect(illegalAtPly).toBe(2);
    expect(positions).toHaveLength(2);
  });

  it('marks stalemate as a draw', () => {
    const sans = 'e3 a5 Qh5 Ra6 Qxa5 h5 h4 Rah6 Qxc7 f6 Qxd7+ Kf7 Qxb7 Qd3 Qxb8 Qh7 Qxc8 Kg6 Qe6'.split(' ');
    const { positions, illegalAtPly } = b.build(sans);
    expect(illegalAtPly).toBeNull();
    expect(positions[positions.length - 1]!.terminal).toBe('draw');
  });

  it('handles an empty move list', () => {
    expect(b.build([]).positions).toHaveLength(1);
  });
});
