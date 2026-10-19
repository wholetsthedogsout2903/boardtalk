import { AnalysisPipeline } from '../analysis/AnalysisPipeline';
import { DiagnosisParser } from '../analysis/diagnosis/DiagnosisParser';
import { LangChainDiagnoser } from '../analysis/diagnosis/LangChainDiagnoser';
import { PromptBuilder } from '../analysis/diagnosis/PromptBuilder';
import { KeyMomentFinder } from '../analysis/KeyMomentFinder';
import { MoveAligner } from '../analysis/MoveAligner';
import { PositionBuilder } from '../analysis/PositionBuilder';
import { PositionEvaluator } from '../analysis/PositionEvaluator';
import { StockfishEngine } from '../analysis/StockfishEngine';
import { WhisperTranscriber } from '../analysis/WhisperTranscriber';
import { RecordingRepository } from '../shared/storage/RecordingRepository';
import { SettingsRepository } from '../shared/storage/SettingsRepository';
import type { Settings } from '../shared/types';
import { AnalyzeController } from './AnalyzeController';
import { ProgressView } from './ProgressView';
import { ReviewView } from './ReviewView';
import { SettingsPanel } from './SettingsPanel';

function createPipeline(repo: RecordingRepository, s: Settings): AnalysisPipeline {
  return new AnalysisPipeline(
    repo,
    new WhisperTranscriber(s.whisperApiKey),
    new PositionBuilder(),
    new PositionEvaluator(new StockfishEngine()),
    new MoveAligner(),
    new KeyMomentFinder(),
    new LangChainDiagnoser(
      { apiKey: s.llmApiKey, baseUrl: s.llmBaseUrl, model: s.llmModel, template: s.feedbackTemplate },
      new PromptBuilder(),
      new DiagnosisParser(),
    ),
  );
}

async function main(): Promise<void> {
  const repo = new RecordingRepository();
  const settingsRepo = new SettingsRepository();
  const id = new URLSearchParams(location.search).get('id') ?? (await repo.latestId());
  const controller = new AnalyzeController({
    root: document.getElementById('app')!,
    repo,
    settingsRepo,
    settingsPanel: new SettingsPanel(settingsRepo),
    progress: new ProgressView(),
    view: new ReviewView(),
    createPipeline: (s) => createPipeline(repo, s),
  });
  await controller.init(id);
}

void main();
