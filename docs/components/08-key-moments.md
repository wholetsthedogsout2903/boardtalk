# 08. Key moments

## Purpose

Pick the few user moves worth diagnosing: the ones that lost the most evaluation while the game was still open, and where the user did not already play the engine's choice. This is pure logic over data produced by 06 and 07.

## Contract

```ts
// analysis/KeyMomentFinder.ts   (pure, plus chess.js via chessUtil)
interface KeyMomentOptions { topN: number; minLossCp: number; decidedCp: number }   // 3, 100, 700
class KeyMomentFinder {
  find(color: Color, positions: Position[], aligned: AlignedMove[],
       evals: PositionEval[], opts: KeyMomentOptions): KeyMoment[];
}

// analysis/chessUtil.ts   (pure)
function uciToSan(fen: string, uci: string): string | null;   // null if not legal in that position
```

## Collaborators

| Who | Calls | Gets |
|---|---|---|
| `AnalysisPipeline` | `finder.find(color, positions, aligned, evals, CONFIG)` | `KeyMoment[]` in game order |
| `KeyMomentFinder` | `toUserCp(cpWhite, color)` (07) | user-POV cp |
| `KeyMomentFinder` | `uciToSan(fenBefore, bestUci)` | engine's best move in SAN |

## Behaviour

Inputs by ply `k` (1-indexed): `positions[k-1]` is the position before the move, `positions[k]` is after. `evals` is indexed by ply into a `Map`.

For each `AlignedMove m` where `m.isUser && m.observedAt !== null`:

1. `before = evals.get(k-1)`, `after = evals.get(k)`. If either is missing, skip.
2. `userBefore = toUserCp(before.cpWhite, color)`, `userAfter = toUserCp(after.cpWhite, color)`.
3. **Skip if `|userBefore| > decidedCp` (700).** The position was already decided in either direction.
4. `cpLoss = userBefore - userAfter`. **Skip if `cpLoss < minLossCp` (100).**
5. `bestSan = uciToSan(before.fen, before.bestUci)`. Skip if `bestUci` is null or the move is illegal.
6. **Skip if `bestSan === positions[k].lastSan`.** The user played the engine's move, so any "loss" is search noise.
7. Emit `KeyMoment`:

| Field | Source |
|---|---|
| `ply` | `k` |
| `fenBefore` | `positions[k-1].fen` |
| `opponentLastSan` | `positions[k-1].lastSan` (null at ply 1) |
| `playedSan` | `positions[k].lastSan` (canonical) |
| `bestSan` | step 5 |
| `evalBeforeCp`, `evalAfterCp` | `userBefore`, `userAfter` |
| `cpLoss` | step 4 |
| `speech` | `m.speech` (null = silent) |

Then sort by `cpLoss` descending, take `topN`, and re-sort by `ply` ascending so the review reads in game order.

Worked example (user is white):

| Ply | `userBefore` | `userAfter` | Result |
|---|---|---|---|
| 13 `Nxe5` | +30 | −310 | loss 340, **candidate** |
| 17 | +820 | +300 | skipped: before is outside ±700 |
| 21 | −40 | −120 | skipped: loss 80 is under 100 |
| 25 | +10 | +10 | skipped: loss 0 |
| 29 `Qh5` | −60 | −480 | loss 420, **candidate** |

With `topN = 3` and only two candidates, two key moments are returned, and the diagnosis covers both.

## Edge cases

| Case | Behaviour |
|---|---|
| No candidates | An empty array. The pipeline skips the LLM call and `buildReview` produces the "no significant mistakes" result. |
| Fewer than 3 candidates | Return what exists. |
| Mate in the "after" position | `userAfter` is −1000, which gives a large loss unless the position was already decided. |
| Missing eval (the pipeline skipped early plies after a mid-game join) | The move is skipped silently. |
| Ties in `cpLoss` | A stable sort, so the earlier ply wins. |
| Moves with `observedAt = null` | Never considered. |

## Errors

None. It is total over its inputs.

## Tests

The worked-example table as the main test. Also cover black as the user colour (sign flips), a user move that equals the engine's best, a missing eval, `topN` truncation and the chronological re-sort, ties, and the 700 and 100 boundaries (`700` is kept and `701` dropped, `99` dropped and `100` kept).
