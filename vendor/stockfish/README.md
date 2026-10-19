# Vendored Stockfish.js

`stockfish-19-lite-single.js` and `.wasm` are the lite, single-threaded build from the
npm package `stockfish@19.0.1` (https://github.com/nmrugg/stockfish.js), copied unchanged.
`Copying.txt` is the GPL-3.0 license text that ships with the package.

Vendored instead of depending on the npm package because the package also contains two
~94 MB full-strength engines that the extension does not use. `build.mjs` copies these two
files to `dist/stockfish/`.

Stockfish is GPL-3.0. If Boardtalk is distributed (for example via the Chrome Web Store),
the corresponding source must be offered.
