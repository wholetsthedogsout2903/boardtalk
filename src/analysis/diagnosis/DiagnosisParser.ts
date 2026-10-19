import type { Diagnosis, KeyMoment } from '../../shared/types';

/**
 * zod validation after stripping code fences. Enforces: one entry per input
 * ply; silent moment => no_structure with quote null; quote must be a verbatim
 * substring of the transcript, otherwise nulled and flagged.
 */
export class DiagnosisParser {
  parse(_raw: string, _moments: KeyMoment[]): Diagnosis {
    throw new Error('Not implemented');
  }
}
