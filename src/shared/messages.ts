import type { Color, MoveEvent, SiteId } from './types';

export interface RecordingPayload {
  site: SiteId;
  gameUrl: string;
  userColor: Color;
  startedAt: number;
  durationMs: number;
  audioMime: string;
  audioBase64: string;
  moves: MoveEvent[];
}

export type Message = { type: 'recording:save'; payload: RecordingPayload };

export type SaveResponse = { ok: true; id: string } | { ok: false; error: string };
