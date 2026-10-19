export type Color = 'white' | 'black';
export type SiteId = 'chesscom' | 'lichess';
export type Stage = 'transcribe' | 'evaluate' | 'diagnose';

export const LABELS = [
  'no_structure',
  'grabbed_material',
  'no_plan',
  'ignored_threat',
  'imagined_threat',
  'misjudged_imbalance',
  'missed_candidate',
] as const;
export type Label = (typeof LABELS)[number];

export const IMBALANCES = [
  'minor_pieces',
  'pawn_structure',
  'files',
  'weak_squares',
  'space',
  'development',
] as const;
export type Imbalance = (typeof IMBALANCES)[number];

/** observedAt is null for moves already on the board when recording started. */
export interface MoveEvent {
  ply: number; // 1-indexed; odd = white
  san: string;
  observedAt: number | null; // epoch ms
}

/** Times are seconds relative to the start of the audio. */
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  noSpeechProb: number;
}

export interface Position {
  ply: number; // 0 = start position
  fen: string;
  lastSan: string | null;
  terminal: 'mate' | 'draw' | null;
}

/** White's point of view, clamped to +/-1000. */
export interface PositionEval {
  ply: number;
  fen: string;
  cpWhite: number;
  bestUci: string | null;
}

export interface AlignedMove {
  ply: number;
  san: string;
  isUser: boolean;
  observedAt: number | null;
  speech: string | null; // null = silent (user moves only)
}

/** Evals are in the user's point of view. */
export interface KeyMoment {
  ply: number;
  fenBefore: string;
  opponentLastSan: string | null;
  playedSan: string;
  bestSan: string;
  evalBeforeCp: number;
  evalAfterCp: number;
  cpLoss: number;
  speech: string | null;
}

export interface MomentDiagnosis {
  ply: number;
  label: Label;
  imbalance: Imbalance | null;
  diagnosis: string;
  quote: string | null;
}

export interface Diagnosis {
  moments: MomentDiagnosis[];
  summary: string;
  habit: string;
  warnings?: string[];
}

export interface AnalysisCache {
  transcript?: TranscriptSegment[]; // raw Whisper segments, unfiltered
  evals?: PositionEval[];
  diagnosis?: Diagnosis;
}

export interface Recording {
  id: string;
  site: SiteId;
  gameUrl: string;
  userColor: Color;
  startedAt: number; // epoch ms, audio start
  durationMs: number;
  audioMime: string;
  moves: MoveEvent[];
  analysis: AnalysisCache;
  createdAt: number;
}

export type RecordingMeta = Omit<Recording, 'analysis'>;

export interface ReviewMoment extends KeyMoment, MomentDiagnosis {}

export interface ReviewResult {
  userMoveCount: number;
  silentCount: number;
  summary: string | null;
  habit: string | null;
  moments: ReviewMoment[];
  warnings: string[];
}

export interface Settings {
  whisperApiKey: string;
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
  feedbackTemplate: string;
}
