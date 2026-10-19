import type { AnalysisPipeline } from '../analysis/AnalysisPipeline';
import type { ProgressView } from './ProgressView';
import type { ReviewView } from './ReviewView';
import type { SettingsPanel } from './SettingsPanel';

/** Loads the recording, wires Analyze / Re-diagnose to the pipeline. */
export class AnalyzeController {
  constructor(
    private readonly settings: SettingsPanel,
    private readonly progress: ProgressView,
    private readonly view: ReviewView,
    private readonly pipeline: AnalysisPipeline,
  ) {}

  init(_id: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
