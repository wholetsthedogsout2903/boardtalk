# Boardtalk

Chrome extension (Manifest V3). Records what you say out loud while playing on chess.com or lichess.org, then diagnoses your thinking after the game using the framework from Silman's *The Amateur's Mind*.

**Hard constraint:** during a game the extension only records. No engine, evaluation, hints or feedback. All analysis happens afterwards on the review page.

## Status

Working MVP, tested but not yet run against the live sites. See "Known gaps" below.

## Run it on another machine

Needs Chrome (or any Chromium browser), Node 22 or newer, and network access for `npm install`. Node 25 is what it was built and tested on.

**Zipping.** Leave out `node_modules/`, `dist/` and `.git/`. `esbuild` ships a platform-specific binary, so a `node_modules/` from this machine won't work on another OS or CPU. `vendor/stockfish/` must stay in the zip, because the build copies the engine from there. Both commands run from the folder that contains `boardtalk/`.

```bash
zip -r boardtalk.zip boardtalk -x 'boardtalk/node_modules/*' 'boardtalk/dist/*' 'boardtalk/.git/*'
```

**On the other machine:**

```bash
unzip boardtalk.zip && cd boardtalk
npm install
npm run build        # bundles into dist/
```

Then open `chrome://extensions`, enable Developer mode, click "Load unpacked" and choose the `dist/` folder. Rebuild and click the reload icon on the extension card after any code change. Reload open chess tabs too, because already-open tabs keep the old content script.

## Test it

### 1. Automated checks (no browser, no API keys)

```bash
npm run typecheck    # expect no output
npm test             # expect: 20 test files, 139 tests, all passing
```

These cover the logic with stubs: alignment, key-moment selection, prompt and parser, storage, the pipeline, the content-script controller. They do not touch chess.com, lichess, a microphone, Whisper or a real LLM, so they can't tell you the extension works end to end. Step 2 does.

### 2. Manual end-to-end test

You need an OpenAI API key (Whisper) and a key for the LLM. The defaults use OpenAI for both, so one key works for both fields.

1. **Open a game.** The quickest is a lichess game against the computer at `https://lichess.org/setup/ai` (no account needed). chess.com works too. Don't open the Boardtalk review page yet.
2. **Start recording.** Click the "Record thinking" button the extension adds to the page, or press Alt+Shift+R (Option+Shift+R on a Mac). Allow the microphone for the site when asked. The button should show that it's recording and an elapsed time.
3. **Play about 8 moves and talk through each one before you move.** Include one real blunder (hang a piece or a pawn) and say something about it, such as "I'll just take the pawn". Stay silent on one or two moves too. Only moves where you lose about a pawn or more can become key moments (see `src/analysis/config.ts`).
4. **Stop recording** with the same button or hotkey. A review tab opens at `review.html?id=...`.
5. **Settings.** Expand "Settings", enter the Whisper key, the LLM key, and leave the base URL and model at their defaults (`https://api.openai.com/v1`, `gpt-4o-mini`) or change them. Click "Save settings". If a permission prompt appears for the LLM host, allow it, then click Save again.
6. **Click "Analyze".** One progress line shows transcribe and evaluate running (evaluate counts positions, about 150 ms each), then the diagnosis.

What a pass looks like:

| Check | Expected |
|---|---|
| Review opens by itself after stopping | A tab with `review.html?id=` |
| Moves captured | The stats line counts your moves, and "Silent on N of M of your moves" matches what you did |
| Key moments | Your blunder appears as a moment with the position's engine move and evaluation |
| Speech attached to the right move | The words you said before the blunder are quoted under that move, not the next one |
| Diagnosis | A label, a one-line explanation, and a summary and habit |
| Reload the review tab | It renders instantly from cache, with no new API calls |
| Toolbar button | Reopens the latest review |

If you didn't lose a pawn anywhere, the Key moments section reads "No move lost 1.0 or more in a position that was still undecided." and the LLM call is skipped. That's correct behaviour, not a failure.

### Troubleshooting

- **"Saved, but no moves were detected"**: the DOM selectors for that site don't match the live page. See Known gaps; the fix goes in one adapter file.
- **Button doesn't appear**: the page was open before the extension was loaded, or the URL isn't on `chess.com` or `lichess.org`. Reload the tab.
- **Recording errors**: open DevTools on the game tab. Boardtalk logs with the prefix `[Boardtalk]`.
- **Analysis errors**: the review page shows which stage failed. A 401 means a wrong key. Service worker logs are under "Inspect views: service worker" on the extension card.
- **Using Vertex AI / another provider**: any OpenAI-compatible endpoint works. Set the base URL, model and token in Settings. Vertex tokens from `gcloud auth print-access-token` last about an hour.

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
