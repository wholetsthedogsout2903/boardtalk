import type { Message, RecordingPayload, SaveResponse } from '../shared/messages';
import { RecordingRepository } from '../shared/storage/RecordingRepository';

function isPayload(p: unknown): p is RecordingPayload {
  const x = p as Partial<RecordingPayload> | null;
  return (
    !!x &&
    typeof x.audioBase64 === 'string' &&
    x.audioBase64.length > 0 &&
    Array.isArray(x.moves) &&
    typeof x.startedAt === 'number' &&
    (x.userColor === 'white' || x.userColor === 'black')
  );
}

export async function handleSave(
  payload: unknown,
  repo: Pick<RecordingRepository, 'save'>,
  openTab: (url: string) => Promise<unknown>,
): Promise<SaveResponse> {
  if (!isPayload(payload)) return { ok: false, error: 'Invalid recording payload' };
  try {
    const id = await repo.save(payload);
    try {
      await openTab(`${chrome.runtime.getURL('review.html')}?id=${id}`);
    } catch (err) {
      console.warn('[Boardtalk] could not open review tab', err); // data is saved; still ok
    }
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: String(err instanceof Error ? err.message : err) };
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  const repo = new RecordingRepository();
  chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
    if (msg?.type !== 'recording:save') return false;
    void handleSave(msg.payload, repo, (url) => chrome.tabs.create({ url })).then(sendResponse);
    return true; // async response
  });

  // Toolbar button reopens the latest review (settings are reachable from there).
  chrome.action.onClicked.addListener(async () => {
    const id = await repo.latestId();
    const base = chrome.runtime.getURL('review.html');
    await chrome.tabs.create({ url: id ? `${base}?id=${id}` : base });
  });
}
