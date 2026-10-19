// Content script entry. Imports ONLY from ../shared and ./ (never ../analysis):
// this bundle must not be able to analyse a position during a game.
import type { SiteAdapter } from './adapters/SiteAdapter';
import { ChessComAdapter } from './adapters/ChessComAdapter';
import { LichessAdapter } from './adapters/LichessAdapter';
import { AudioRecorder } from './AudioRecorder';
import { MoveListWatcher } from './MoveListWatcher';
import { MoveLogger } from './MoveLogger';
import { RecordButton } from './RecordButton';
import { RecorderController } from './RecorderController';

function adapterForHost(host: string): SiteAdapter | null {
  if (host === 'chess.com' || host.endsWith('.chess.com')) return new ChessComAdapter();
  if (host === 'lichess.org' || host.endsWith('.lichess.org')) return new LichessAdapter();
  return null;
}

const adapter = adapterForHost(location.hostname);
if (adapter) {
  const controller = new RecorderController(
    adapter,
    new AudioRecorder(),
    new MoveListWatcher(adapter),
    new MoveLogger(),
    new RecordButton(),
  );
  // Alt+Shift+R. Match event.code: on macOS Option+R produces "®" in event.key.
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyR' && !e.repeat) {
      e.preventDefault();
      controller.toggle();
    }
  });
}
