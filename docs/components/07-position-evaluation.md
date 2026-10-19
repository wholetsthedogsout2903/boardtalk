# 07. Position evaluation

## Purpose

Replay the recorded moves into positions and get an engine evaluation and best move for each one. This section is the only place chess.js position state and the Stockfish worker are used together.

## Contract

```ts
// analysis/PositionBuilder.ts   (pure, uses chess.js)
interface BuildResult { positions: Position[]; illegalAtPly: number | null }
class PositionBuilder { build(sans: string[]): BuildResult; }

// analysis/StockfishEngine.ts
interface EngineScore { cp?: number; mate?: number; bestUci: string | null }   // side-to-move POV
class StockfishEngine {
  init(): Promise<void>;
  analyse(fen: string, movetimeMs: number): Promise<EngineScore>;   // strictly serial
  dispose(): void;
}

// analysis/PositionEvaluator.ts
class PositionEvaluator {
  constructor(engine: StockfishEngine);
  evaluateAll(positions: Position[], onProgress: (done: number, total: number) => void): Promise<PositionEval[]>;
}

// analysis/score.ts   (pure)
const MATE_CLAMP_CP = 1000;
function toWhiteCp(score: EngineScore, sideToMove: Color): number;   // clamped to [-1000, 1000]
function toUserCp(cpWhite: number, userColor: Color): number;
```

## Collaborators

| Who | Calls | Gets |
|---|---|---|
| `AnalysisPipeline` | `builder.build(rec.moves.map(m => m.san))` | positions, plus where replay stopped |
| `AnalysisPipeline` | `evaluator.evaluateAll(subset, cb)` | `PositionEval[]` (white POV) |
| `PositionEvaluator` | `engine.init()`, `engine.analyse(fen, 150)`, `engine.dispose()` | `EngineScore` |
| `PositionEvaluator` | `toWhiteCp(score, sideToMove)` | white-POV cp |
| `KeyMomentFinder` (08) | `toUserCp(...)` | user-POV cp |

## Behaviour

### `PositionBuilder.build`

```
chess = new Chess()
positions = [{ ply: 0, fen: start, lastSan: null, terminal: null }]
for i, san in sans:
    try move = chess.move(san)                       // chess.js v1 throws on illegal
    catch -> return { positions, illegalAtPly: i+1 } // stop at first illegal SAN
    positions.push({
      ply: i+1,
      fen: chess.fen(),
      lastSan: move.san,                             // canonical SAN, not the recorded text
      terminal: chess.isCheckmate() ? 'mate' : chess.isDraw() ? 'draw' : null
    })
return { positions, illegalAtPly: null }
```

`lastSan` is chess.js's canonical form. Everything shown to the user or sent to the LLM uses it, so site formatting quirks never leak through.

### `StockfishEngine` (UCI over a Web Worker)

| Step | Sent | Wait for |
|---|---|---|
| init | `uci` | `uciok` |
| init | `setoption name Threads value 1`, `setoption name Hash value 16` | none |
| init | `ucinewgame`, `isready` | `readyok` |
| analyse | `position fen <fen>`, `go movetime <ms>` | `bestmove <uci> …` |
| dispose | `quit`, then `worker.terminate()` | none |

- The worker script is `public/stockfish/…js` (single-thread lite build) loaded with `new Worker(chrome.runtime.getURL(...))`. The `.wasm` sits beside it. The extension-page CSP needs `'wasm-unsafe-eval'`.
- While searching, the engine emits `info … score cp N` or `score mate N`. Keep the **last** such line before `bestmove`. A line without `multipv`, or with `multipv 1`, is the main line.
- `bestmove (none)` means no legal move, so `bestUci = null`.
- Calls are queued. A second `analyse` waits for the first. There is one search in flight at a time.
- **Timeout:** if no `bestmove` arrives within `movetime + 5000` ms, terminate the worker and reject. The error is `AnalysisError('evaluate', 'engine')`. A worker `error` event rejects the same way.

### `PositionEvaluator.evaluateAll`

```
await engine.init()
try:
  for i, p in positions:
      if p.terminal === 'mate':  // side to move is checkmated
          cpWhite = (sideToMove(p.fen) === 'white') ? -1000 : +1000 ; bestUci = null
      else if p.terminal === 'draw':
          cpWhite = 0 ; bestUci = null
      else:
          s = await engine.analyse(p.fen, MOVETIME_MS)         // 150
          cpWhite = toWhiteCp(s, sideToMove(p.fen)) ; bestUci = s.bestUci
      out.push({ ply: p.ply, fen: p.fen, cpWhite, bestUci })
      onProgress(i+1, positions.length)
finally: engine.dispose()
return out
```

`sideToMove(fen)` reads the second FEN field (`w` or `b`). Terminal positions never touch the engine.

### Score maths (`score.ts`)

The engine reports from the **side to move's** point of view. Everything stored is white's POV. Key-moment logic converts to the user's POV.

| Engine output | Side to move | White POV (`cpWhite`) |
|---|---|---|
| `cp +50` | white | +50 |
| `cp +50` | black | −50 |
| `cp −2300` | white | −1000 (clamped) |
| `mate 3` (side to move mates) | white | +1000 |
| `mate -2` (side to move gets mated) | black | +1000 |

`toUserCp(cpWhite, color)` is `color === 'white' ? cpWhite : -cpWhite`. All values, mate or not, are clamped to ±1000 so a mate score never swamps the loss maths.

### Budget

About 85 positions at 150 ms is roughly 13 s, and 120 plies is about 18 s. Positions before the first timed user move are skipped (see 10), which saves time after a mid-game join. Progress is reported per position.

## Edge cases

| Case | Behaviour |
|---|---|
| Illegal SAN at ply *n* | `illegalAtPly = n`. The pipeline continues with the first *n−1* plies and adds a warning. If fewer than 2 positions result, the run fails as `unsupported`. |
| Game ended in checkmate, stalemate or draw | The final position is terminal and scored without the engine. Stalemate counts as 0, so a stalemate blunder shows up as a big loss. |
| Engine hangs | The timeout rejects, and `finally` terminates the worker. |
| Review tab closed mid-evaluation | The worker dies with the page. Nothing is cached. |
| 150 ms evaluation noise | Eval-after is a separate search from eval-before, so `cpLoss` can be off by tens of cp. The 100 cp threshold and the best-move guard in 08 absorb most of it. |

## Errors

`AnalysisError('evaluate', 'engine')` for worker failures and timeouts. `unsupported` is raised by the pipeline, not here.

## Tests

- **`PositionBuilder`:** a known short game with expected FENs, an illegal SAN midway, mate and stalemate endings, and canonical SAN (feed it `Nf3` without `+`).
- **`score`:** the table above, plus clamping.
- **`PositionEvaluator`:** a fake engine returning scripted `EngineScore`s. Cover terminal short-circuiting, black-to-move conversion, progress calls, and that `dispose` runs on failure.
- **`StockfishEngine`:** manual or integration only. It needs a real worker and wasm. Spike 3 covers it.
