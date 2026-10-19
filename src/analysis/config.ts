export const MOVETIME_MS = 150;
export const NO_SPEECH_THRESHOLD = 0.6;
export const WHISPER_MAX_BYTES = 25 * 1024 * 1024;
export const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';
/** Engine and mate scores are clamped to +/- this many centipawns. */
export const MATE_CLAMP_CP = 1000;
export const KEY_MOMENTS = { topN: 3, minLossCp: 100, decidedCp: 700 };
