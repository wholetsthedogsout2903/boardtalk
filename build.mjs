// Bundles the three entry points and assembles dist/ (load it as an unpacked extension).
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/stockfish', { recursive: true });

await build({
  entryPoints: {
    content: 'src/content/main.ts',
    background: 'src/background/service-worker.ts',
    review: 'src/review/main.ts',
  },
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
});

copyFileSync('manifest.json', 'dist/manifest.json');
copyFileSync('src/review/review.html', 'dist/review.html');
for (const f of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  copyFileSync(`vendor/stockfish/${f}`, `dist/stockfish/${f}`);
}
