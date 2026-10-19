# 06. Transcription and alignment

## Purpose

Turn the audio blob into timestamped text, discard Whisper's silence hallucinations, and attach each piece of speech to the user move it led up to. This section is where "what was said" meets "what was played".

## Contract

```ts
// analysis/AnalysisPipeline.ts
interface Transcriber {
  transcribe(audio: Blob): Promise<TranscriptSegment[]>;     // raw segments, unfiltered
}

// analysis/WhisperTranscriber.ts
class WhisperTranscriber implements Transcriber {
  constructor(apiKey: string, fetchFn?: typeof fetch);        // fetch injectable for tests
}

// analysis/speech.ts   (pure)
function dropNonSpeech(segments: TranscriptSegment[], threshold?: number): TranscriptSegment[];

// analysis/MoveAligner.ts   (pure)
class MoveAligner {
  align(rec: Recording, segments: TranscriptSegment[]): AlignedMove[];
}
```

## Collaborators

| Who | Calls | Gets |
|---|---|---|
| `AnalysisPipeline` | `repo.getAudio(id)`, then `transcriber.transcribe(blob)` | blob, raw segments |
| `AnalysisPipeline` | `dropNonSpeech(raw)` then `aligner.align(rec, filtered)` | filtered segments, `AlignedMove[]` |
| `WhisperTranscriber` | `fetch` to the OpenAI API | verbose JSON |

## Behaviour

### `WhisperTranscriber.transcribe`

1. If `audio.size > 25 * 1024 * 1024`, throw `AnalysisError('transcribe', 'too_large')` before any upload.
2. If `apiKey` is empty, throw `AnalysisError('transcribe', 'config')`.
3. `POST https://api.openai.com/v1/audio/transcriptions` with `Authorization: Bearer <key>` and `multipart/form-data`: `file` (the blob, filename `audio.webm`), `model=whisper-1`, `response_format=verbose_json`. Timeout is 10 minutes (`AbortSignal.timeout`).
4. Map the response: for each item in `segments`, `{ start, end, text: text.trim(), noSpeechProb: no_speech_prob }`. Drop segments with empty text.
5. HTTP errors: 401 or 403 give `auth`, 413 gives `too_large`, everything else (429, 5xx, network) gives `network` with the status in the message.

The host is covered by the static `host_permissions`, so there is no CORS issue from the extension page.

### `dropNonSpeech`

Keep a segment if `noSpeechProb <= 0.6` (constant in `config.ts`) and its text has a non-whitespace character. Whisper tends to invent text ("Thanks for watching") over silence, and `no_speech_prob` is its own signal for that. This function runs on the raw transcript at use time, which is why the cache stores raw segments.

### `MoveAligner.align`

Rule from the task: **everything said since the user's previous move belongs to the following user move.**

Inputs: `rec.moves`, `rec.userColor`, `rec.startedAt`, and the filtered segments. A user move is one whose ply parity matches the colour (white is odd). A **timed** user move has `observedAt !== null`.

```
for each segment (in order):
    t = rec.startedAt + segment.start * 1000          // epoch ms, same clock as observedAt
    u = first timed user move with u.observedAt > t   // strictly greater
    if u exists: bucket[u.ply].push(segment.text)
    else:        drop                                  // spoken after the user's last move
speech(u) = bucket[u.ply].join(' ').trim()  ||  null   // null = silent
```

Output is one `AlignedMove` per ply: `{ ply, san, isUser, observedAt, speech }`. `speech` is only ever non-null for timed user moves.

```
time ──►   0s        12s       15s            40s       55s       80s
moves:               e4 (you)  e5 (opp)       Nf3 (you) …         …
                     ▲ ply1    ▲ ply2         ▲ ply3
speech:  [s1 3-8s]   [s2 20-24s]  [s3 30-36s]
          └──► ply1   └────────────┴────────────► ply3
```

Worked example (`startedAt = 1,000,000`; user is white):

| Segment | Absolute start | First timed user move with `observedAt >` that | Assigned to |
|---|---|---|---|
| s1 "let me just develop" (3.0 s) | 1,003,000 | ply 1, e4 @ 1,012,000 | ply 1 |
| s2 "he played e5 so" (20 s) | 1,020,000 | ply 3, Nf3 @ 1,040,000 | ply 3 |
| s3 "knight f3 attacks e5" (30 s) | 1,030,000 | ply 3 | ply 3 |

Ply 3 speech is "he played e5 so knight f3 attacks e5". Ply 1 is "let me just develop". Speech during the opponent's turn counts for the user's *next* move, as intended.

Why strictly `>`: a segment that starts at the very instant a move appears is speech *after* that move, so it belongs to the next one.

## Edge cases

| Case | Behaviour |
|---|---|
| Segment straddles a move (long segments run up to about 30 s) | Assigned by **start time**. Known limitation. Word-level timestamps would fix it later. |
| Speech after the user's last move | Dropped. |
| Recording started mid-game | Pre-existing moves are not timed, so they get no speech and don't count as silent. |
| User plays black | The first timed user move is ply 2. Speech before it, including the opponent's first move, goes there. |
| Whisper returns zero segments | Every timed user move is silent. This is valid, not an error. |
| Clock offset | `startedAt` and every `observedAt` come from the same `Date.now()` in the content script, so there is no skew. Whisper times are relative to the audio start and are converted only here. |
| Bluetooth or other mic start latency | Some devices delay the first samples. The clap test (spike 4) measures this. A fixed offset could be added later, not in the MVP. |

## Errors

Only `WhisperTranscriber` throws, as `AnalysisError('transcribe', kind)`. The aligner and filter are total functions.

## Tests

- **`dropNonSpeech`:** threshold edge (`0.6` kept, `0.61` dropped) and empty text.
- **`MoveAligner`:** the worked example above as a test, plus black-colour, mid-game join, speech after the last move, a segment starting exactly at a move's timestamp, empty segments, and multiple segments joining in order.
- **`WhisperTranscriber`:** injected fake `fetch`. Cover a verbose JSON happy path, 401, 413, 429, a network error, the oversize blob, and an empty key.
