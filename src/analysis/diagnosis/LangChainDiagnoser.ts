import type { Diagnosis, KeyMoment } from '../../shared/types';
import type { Diagnoser } from '../AnalysisPipeline';
import type { DiagnosisParser } from './DiagnosisParser';
import type { PromptBuilder } from './PromptBuilder';

/**
 * The only file allowed to import LangChain. ChatOpenAI with configurable
 * baseURL / apiKey / model (dangerouslyAllowBrowser). One call, one retry on a
 * parse failure.
 */
export class LangChainDiagnoser implements Diagnoser {
  constructor(
    private readonly cfg: { apiKey: string; baseUrl: string; model: string; template: string },
    private readonly prompts: PromptBuilder,
    private readonly parser: DiagnosisParser,
  ) {}

  diagnose(_moments: KeyMoment[]): Promise<Diagnosis> {
    throw new Error('Not implemented');
  }
}
