# Chess Thinking Review

Chrome extension (Manifest V3). Records what you say out loud while playing on chess.com or lichess.org, then diagnoses your thinking after the game using the framework from Silman's *The Amateur's Mind*.

**Hard constraint:** during a game the extension only records. No engine, evaluation, hints or feedback. All analysis happens afterwards on the review page.

## Status

Design and skeleton only. The files under `src/` are stubs (types, interfaces, and classes that throw `Not implemented`). Nothing is wired up, bundled or runnable yet.

## Docs

- [`docs/task.txt`](docs/task.txt) - the MVP task as originally written
- [`docs/architecture.md`](docs/architecture.md) - architecture, class design, diagrams, open decisions, first spikes

## Layout

```
manifest.json
public/stockfish/        stockfish.js lite single-thread .js + .wasm (to be added)
src/shared/              domain types, message contract, storage repositories
src/content/             content script (may import ONLY shared/)
src/background/          service worker
src/review/              review page UI
src/analysis/            transcribe, align, evaluate, diagnose (imported only by review/)
```

The content script must never import `src/analysis/`. That boundary is what guarantees the "no help during a game" constraint, so enforce it in the bundler or lint config when one is added.

## Not decided yet

Bundler and test runner (design assumes Vite + vitest), dependency versions, and lint config. These are added when implementation starts.
