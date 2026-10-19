import type { Stage } from '../shared/types';

export type ErrorKind =
  | 'config'
  | 'auth'
  | 'too_large'
  | 'network'
  | 'permission'
  | 'parse'
  | 'engine'
  | 'unsupported';

export class AnalysisError extends Error {
  constructor(
    public readonly stage: Stage,
    public readonly kind: ErrorKind,
    message: string,
    /** Optional raw text (e.g. the model's reply) shown as plain text. */
    public readonly detail?: string,
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}
