import { AnalysisError } from './errors';

/** Score from the side-to-move's point of view. */
export interface EngineScore {
  cp?: number;
  mate?: number;
  bestUci: string | null;
}

/** The slice of Worker we use; injectable for tests. */
export interface WorkerLike {
  postMessage(msg: string): void;
  terminate(): void;
  onmessage: ((e: { data: unknown }) => void) | null;
  onerror: ((e: unknown) => void) | null;
}

export const ENGINE_FILE = 'stockfish/stockfish-19-lite-single.js';

const INIT_TIMEOUT_MS = 30_000;
const SEARCH_SLACK_MS = 5_000;

function defaultWorker(): WorkerLike {
  return new Worker(chrome.runtime.getURL(ENGINE_FILE)) as unknown as WorkerLike;
}

/**
 * Wraps the bundled stockfish.js lite single-thread worker (UCI over
 * postMessage). Calls are strictly serial.
 */
export class StockfishEngine {
  private worker: WorkerLike | null = null;
  private onLine: ((line: string) => void) | null = null;
  private chain: Promise<unknown> = Promise.resolve();

  constructor(private readonly createWorker: () => WorkerLike = defaultWorker) {}

  async init(): Promise<void> {
    this.worker = this.createWorker();
    this.worker.onmessage = (e) => {
      if (typeof e.data === 'string') this.onLine?.(e.data);
    };
    this.worker.onerror = () => this.onLine?.('__error__');
    await this.run(['uci'], (l) => l === 'uciok', INIT_TIMEOUT_MS);
    this.send('setoption name Threads value 1');
    this.send('setoption name Hash value 16');
    await this.run(['ucinewgame', 'isready'], (l) => l === 'readyok', INIT_TIMEOUT_MS);
  }

  analyse(fen: string, movetimeMs: number): Promise<EngineScore> {
    const job = this.chain.then(() => this.search(fen, movetimeMs));
    this.chain = job.catch(() => undefined);
    return job;
  }

  dispose(): void {
    if (!this.worker) return;
    try {
      this.worker.postMessage('quit');
    } catch {
      /* worker already gone */
    }
    this.worker.terminate();
    this.worker = null;
  }

  private send(cmd: string): void {
    if (!this.worker) throw new AnalysisError('evaluate', 'engine', 'Engine is not running');
    this.worker.postMessage(cmd);
  }

  private run(cmds: string[], done: (line: string) => boolean, timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.onLine = null;
        this.dispose();
        reject(new AnalysisError('evaluate', 'engine', 'The chess engine timed out'));
      }, timeoutMs);
      this.onLine = (line) => {
        if (line === '__error__') {
          clearTimeout(timer);
          this.onLine = null;
          this.dispose();
          reject(new AnalysisError('evaluate', 'engine', 'The chess engine failed to run'));
        } else if (done(line)) {
          clearTimeout(timer);
          this.onLine = null;
          resolve();
        }
      };
      try {
        cmds.forEach((c) => this.send(c));
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  private async search(fen: string, movetimeMs: number): Promise<EngineScore> {
    let cp: number | undefined;
    let mate: number | undefined;
    let bestUci: string | null = null;
    const done = (line: string): boolean => {
      if (line.startsWith('info ') && !/\bmultipv (?!1\b)/.test(line)) {
        const m = /\bscore (cp|mate) (-?\d+)/.exec(line);
        if (m) {
          if (m[1] === 'cp') {
            cp = Number(m[2]);
            mate = undefined;
          } else {
            mate = Number(m[2]);
            cp = undefined;
          }
        }
      }
      const b = /^bestmove (\S+)/.exec(line);
      if (b) {
        bestUci = b[1] === '(none)' ? null : (b[1] ?? null);
        return true;
      }
      return false;
    };
    await this.run(
      [`position fen ${fen}`, `go movetime ${movetimeMs}`],
      done,
      movetimeMs + SEARCH_SLACK_MS,
    );
    return { cp, mate, bestUci };
  }
}
