import type { Color, KeyMoment } from '../../shared/types';

export interface PromptMessages {
  system: string;
  human: string;
}

/**
 * System = fixed contract (labels, JSON shape, no invented analysis, verbatim
 * quotes) + editable template. Human = moments as JSON, transcript delimited
 * and labelled as data.
 */
export class PromptBuilder {
  build(_template: string, _color: Color, _moments: KeyMoment[]): PromptMessages {
    throw new Error('Not implemented');
  }
}
