// @vitest-environment jsdom
// NOTE: these use SYNTHETIC DOM that mirrors our assumptions about each site. They check
// the adapters' logic, not that the selectors match the live sites (see docs spike 2).
import { beforeEach, describe, expect, it } from 'vitest';
import { ChessComAdapter } from './ChessComAdapter';
import { LichessAdapter } from './LichessAdapter';

beforeEach(() => document.body.replaceChildren());

describe('LichessAdapter (synthetic DOM)', () => {
  it('reads orientation and ignores move numbers, results and clocks', () => {
    document.body.innerHTML = `
      <div class="cg-wrap orientation-black"></div>
      <div class="rmoves"><l4x>
        <i5z>1</i5z><kwdb>e4</kwdb><kwdb>e5</kwdb>
        <i5z>2</i5z><kwdb>Nf3</kwdb><kwdb>O-O</kwdb>
      </l4x><p class="result">1-0</p><span>5:00</span></div>`;
    const a = new LichessAdapter();
    expect(a.userColor()).toBe('black');
    expect(a.readMoves()).toEqual(['e4', 'e5', 'Nf3', 'O-O']);
    expect(a.moveListRoot()).not.toBeNull();
  });

  it('returns null / [] when nothing is on the page', () => {
    const a = new LichessAdapter();
    expect(a.userColor()).toBeNull();
    expect(a.readMoves()).toEqual([]);
    expect(a.moveListRoot()).toBeNull();
  });

  it('defaults to white when not flipped', () => {
    document.body.innerHTML = '<div class="cg-wrap orientation-white"></div>';
    expect(new LichessAdapter().userColor()).toBe('white');
  });
});

describe('ChessComAdapter (synthetic DOM)', () => {
  it('converts figurine icons and reads the flipped board', () => {
    document.body.innerHTML = `
      <wc-chess-board class="board flipped"></wc-chess-board>
      <wc-move-list>
        <div class="node"><span class="node-highlight-content">e4</span></div>
        <div class="node"><span class="node-highlight-content"><span data-figurine="N"></span>f3</span></div>
        <div class="node"><span class="node-highlight-content"><span class="icon-font-chess bishop-white"></span>b5</span></div>
        <div class="node"><span class="node-highlight-content">0-0</span></div>
      </wc-move-list>`;
    const a = new ChessComAdapter();
    expect(a.userColor()).toBe('black');
    expect(a.readMoves()).toEqual(['e4', 'Nf3', 'Bb5', 'O-O']);
  });

  it('falls back to leaf text when there are no .node elements', () => {
    document.body.innerHTML = `<wc-move-list><span>1.</span><span>d4</span><span>d5</span></wc-move-list>`;
    expect(new ChessComAdapter().readMoves()).toEqual(['d4', 'd5']);
  });

  it('returns null without a board', () => {
    expect(new ChessComAdapter().userColor()).toBeNull();
  });
});
