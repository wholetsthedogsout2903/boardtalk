import { z } from 'zod';
import { IMBALANCES, LABELS } from '../../shared/types';
import type { Diagnosis, KeyMoment } from '../../shared/types';

export class DiagnosisParseError extends Error {}

const schema = z.object({
  moments: z.array(
    z.object({
      ply: z.number().int(),
      label: z.enum(LABELS),
      imbalance: z.enum(IMBALANCES).nullable().optional(),
      diagnosis: z.string().min(1),
      quote: z.string().nullable().optional(),
    }),
  ),
  summary: z.string().min(1),
  habit: z.string().min(1),
});

const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

function extractJson(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new DiagnosisParseError('No JSON object found in the reply');
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    throw new DiagnosisParseError(`Reply is not valid JSON (${String(err)})`);
  }
}

/**
 * Validates the model's reply. Throws DiagnosisParseError on structural problems
 * (bad JSON/schema, wrong set of plies). Repairs the rest: stray imbalance,
 * silent moments forced to no_structure, unverifiable quotes nulled (with a warning).
 */
export class DiagnosisParser {
  parse(raw: string, moments: KeyMoment[]): Diagnosis {
    const parsed = schema.safeParse(extractJson(raw));
    if (!parsed.success) {
      const why = parsed.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`);
      throw new DiagnosisParseError(`Reply does not match the schema (${why.join('; ')})`);
    }
    const data = parsed.data;

    const expected = moments.map((m) => m.ply).sort((a, b) => a - b);
    const got = data.moments.map((m) => m.ply).sort((a, b) => a - b);
    if (expected.length !== got.length || expected.some((p, i) => p !== got[i])) {
      throw new DiagnosisParseError(
        `Expected exactly one entry for plies [${expected.join(', ')}] but got [${got.join(', ')}]`,
      );
    }

    const warnings: string[] = [];
    const byPly = new Map(moments.map((m) => [m.ply, m]));
    const out = data.moments.map((d) => {
      const km = byPly.get(d.ply)!;
      let label = d.label;
      let quote = d.quote ?? null;
      let imbalance = label === 'misjudged_imbalance' ? (d.imbalance ?? null) : null;
      if (km.speech === null) {
        if (label !== 'no_structure') {
          warnings.push(`Move ${Math.ceil(d.ply / 2)}: silent move, label changed to "no_structure".`);
        }
        label = 'no_structure';
        quote = null;
        imbalance = null;
      } else if (quote !== null && !normalise(km.speech).includes(normalise(quote))) {
        warnings.push(`Move ${Math.ceil(d.ply / 2)}: the model's quote was not found in your words and was removed.`);
        quote = null;
      }
      return { ply: d.ply, label, imbalance, diagnosis: d.diagnosis, quote };
    });
    out.sort((a, b) => a.ply - b.ply);
    return { moments: out, summary: data.summary, habit: data.habit, warnings };
  }
}
