/** Score from the side-to-move's point of view. */
export interface EngineScore {
  cp?: number;
  mate?: number;
  bestUci: string | null;
}

/**
 * Wraps the bundled stockfish.js lite (single-thread) Web Worker. UCI handshake,
 * then `position fen` + `go movetime`. Calls are strictly serial.
 */
export class StockfishEngine {
  init(): Promise<void> {
    throw new Error('Not implemented');
  }

  analyse(_fen: string, _movetimeMs: number): Promise<EngineScore> {
    throw new Error('Not implemented');
  }

  dispose(): void {
    throw new Error('Not implemented');
  }
}
