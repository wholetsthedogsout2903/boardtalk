import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import type { Color, Diagnosis, KeyMoment } from '../../shared/types';
import type { Diagnoser } from '../AnalysisPipeline';
import { AnalysisError } from '../errors';
import { DiagnosisParseError } from './DiagnosisParser';
import type { DiagnosisParser } from './DiagnosisParser';
import type { PromptBuilder } from './PromptBuilder';

export interface DiagnoserConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  template: string;
}

/** The slice of a LangChain chat model we use; injectable for tests. */
export interface ChatModel {
  invoke(messages: BaseMessage[]): Promise<{ content: unknown }>;
}

function defaultModel(cfg: DiagnoserConfig): ChatModel {
  return new ChatOpenAI({
    model: cfg.model,
    apiKey: cfg.apiKey,
    configuration: { baseURL: cfg.baseUrl, dangerouslyAllowBrowser: true },
  });
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === 'string' ? part : ((part as { text?: string }).text ?? ''),
      )
      .join('');
  }
  return String(content ?? '');
}

async function hasHostAccess(baseUrl: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions?.contains) return true;
  try {
    return await chrome.permissions.contains({ origins: [`${new URL(baseUrl).origin}/*`] });
  } catch {
    return true;
  }
}

/**
 * The only file allowed to import LangChain. One call, plus one corrective
 * retry (the reply and the reason it was rejected are fed back) on a parse failure.
 */
export class LangChainDiagnoser implements Diagnoser {
  constructor(
    private readonly cfg: DiagnoserConfig,
    private readonly prompts: PromptBuilder,
    private readonly parser: DiagnosisParser,
    private readonly makeModel: (cfg: DiagnoserConfig) => ChatModel = defaultModel,
  ) {}

  async diagnose(moments: KeyMoment[], color: Color): Promise<Diagnosis> {
    const { apiKey, baseUrl, model } = this.cfg;
    const missing = [
      !apiKey && 'LLM API key',
      !baseUrl && 'LLM base URL',
      !model && 'model name',
    ].filter(Boolean);
    if (missing.length > 0) {
      throw new AnalysisError('diagnose', 'config', `Missing setting: ${missing.join(', ')}.`);
    }
    if (!(await hasHostAccess(baseUrl))) {
      throw new AnalysisError(
        'diagnose',
        'permission',
        `No permission to reach ${new URL(baseUrl).origin}. Re-save your settings to grant access.`,
      );
    }

    const { system, human } = this.prompts.build(this.cfg.template, color, moments);
    const chat = this.makeModel(this.cfg);
    const messages: BaseMessage[] = [new SystemMessage(system), new HumanMessage(human)];

    const raw1 = await this.call(chat, messages);
    try {
      return this.parser.parse(raw1, moments);
    } catch (err) {
      if (!(err instanceof DiagnosisParseError)) throw err;
      const raw2 = await this.call(chat, [
        ...messages,
        new AIMessage(raw1),
        new HumanMessage(
          `Your reply was invalid: ${err.message}. Return only the corrected JSON object.`,
        ),
      ]);
      try {
        return this.parser.parse(raw2, moments);
      } catch (err2) {
        if (!(err2 instanceof DiagnosisParseError)) throw err2;
        throw new AnalysisError(
          'diagnose',
          'parse',
          `The model's reply wasn't valid: ${err2.message}`,
          raw2.slice(0, 600),
        );
      }
    }
  }

  private async call(chat: ChatModel, messages: BaseMessage[]): Promise<string> {
    try {
      return contentToText((await chat.invoke(messages)).content);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        throw new AnalysisError('diagnose', 'auth', 'The LLM API rejected the key.');
      }
      const reason = status ? `HTTP ${status}` : String(err instanceof Error ? err.message : err);
      throw new AnalysisError('diagnose', 'network', `LLM request failed (${reason}).`);
    }
  }
}
