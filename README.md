# Boardtalk

Chrome extension (Manifest V3). Records what you say out loud while playing on chess.com or lichess.org, then diagnoses your thinking after the game using the framework from Silman's *The Amateur's Mind*.

**Hard constraint:** during a game the extension only records. No engine, evaluation, hints or feedback. All analysis happens afterwards on the review page.

## Status

Working MVP, tested but not yet run against the live sites. See "Known gaps" below.

## Build and load

```bash
npm install
npm run build        # bundles into dist/
npm run typecheck
npm test
```

Then open `chrome://extensions`, enable Developer mode, click "Load unpacked" and choose `dist/`.

1. Open a game on chess.com or lichess.org and click "Record thinking" (or press Alt+Shift+R). Allow the microphone for the site.
2. Think out loud while you play. Stop the recording after the game (same button or hotkey).
3. The review page opens. Under Settings, enter your OpenAI key (Whisper), an LLM key, base URL and model, click Save, then Analyze.
4. The toolbar button reopens the latest review.

## Known gaps

- The chess.com and lichess DOM selectors in `src/content/adapters/` are written from memory and only tested against synthetic DOM. If a recording saves with "0 moves detected", fix the selectors in the one adapter for that site.
- Whisper and the LLM have only been exercised against stubbed endpoints.
- In the browser smoke test the microphone was a synthetic track (no audio device in the test sandbox); `MediaRecorder` Opus encoding was real.

## Docs

- [`docs/task.txt`](docs/task.txt) - the MVP task as originally written
- [`docs/architecture.md`](docs/architecture.md) - architecture, class design, diagrams, open decisions, first spikes
- [`docs/components/`](docs/components/README.md) - per-component design: contracts, algorithms, edge cases, interactions

## Layout

```
manifest.json
vendor/stockfish/        stockfish.js 19 lite single-thread .js + .wasm (vendored, GPL-3.0)
src/shared/              domain types, message contract, storage repositories
src/content/             content script (may import ONLY shared/)
src/background/          service worker
src/review/              review page UI
src/analysis/            transcribe, align, evaluate, diagnose (imported only by review/)
```

The content script must never import `src/analysis/`. That boundary is what guarantees the "no help during a game" constraint, so enforce it in the bundler or lint config when one is added.

## Tooling

esbuild bundles three entry points (`build.mjs`), vitest runs the tests, tsc type-checks. No lint config yet.
