import { describe, expect, it } from 'vitest';
import { StockfishEngine } from './StockfishEngine';
import type { WorkerLike } from './StockfishEngine';

/** A scripted UCI engine: answers commands synchronously via onmessage. */
function fakeWorker(searchReplies: string[][]): WorkerLike & { sent: string[] } {
  let search = 0;
  const w: WorkerLike & { sent: string[] } = {
    sent: [],
    onmessage: null,
    onerror: null,
    terminate() {},
    postMessage(msg) {
      w.sent.push(msg);
      const say = (l: string) => w.onmessage?.({ data: l });
      if (msg === 'uci') say('uciok');
      else if (msg === 'isready') say('readyok');
      else if (msg.startsWith('go ')) searchReplies[search++]!.forEach(say);
    },
  };
  return w;
}

describe('StockfishEngine', () => {
  it('initialises, searches and parses cp and mate scores', async () => {
    const w = fakeWorker([
      ['info depth 8 score cp 12 nodes 1', 'info depth 12 score cp 31 nodes 9', 'bestmove e2e4 ponder e7e5'],
      ['info depth 3 score mate -2 nodes 1', 'bestmove g1f3'],
      ['info depth 1 score cp 0', 'bestmove (none)'],
    ]);
    const e = new StockfishEngine(() => w);
    await e.init();
    expect(w.sent).toContain('ucinewgame');
    expect(await e.analyse('fen1', 150)).toEqual({ cp: 31, mate: undefined, bestUci: 'e2e4' });
    expect(await e.analyse('fen2', 150)).toEqual({ cp: undefined, mate: -2, bestUci: 'g1f3' });
    expect((await e.analyse('fen3', 150)).bestUci).toBeNull();
    expect(w.sent).toContain('position fen fen1');
    expect(w.sent).toContain('go movetime 150');
  });

  it('ignores secondary multipv lines', async () => {
    const w = fakeWorker([
      ['info depth 10 multipv 1 score cp 40', 'info depth 10 multipv 2 score cp -90', 'bestmove d2d4'],
    ]);
    const e = new StockfishEngine(() => w);
    await e.init();
    expect((await e.analyse('f', 100)).cp).toBe(40);
  });

  it('serialises concurrent analyse calls', async () => {
    const w = fakeWorker([
      ['info score cp 1', 'bestmove a2a3'],
      ['info score cp 2', 'bestmove b2b3'],
    ]);
    const e = new StockfishEngine(() => w);
    await e.init();
    const [a, b] = await Promise.all([e.analyse('f1', 10), e.analyse('f2', 10)]);
    expect([a.cp, b.cp]).toEqual([1, 2]);
  });
});
