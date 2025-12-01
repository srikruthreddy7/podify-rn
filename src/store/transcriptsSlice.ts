import { StateCreator } from 'zustand';
import { Transcript, TranscriptSegment } from '../types';

export interface TranscriptsSlice {
  transcripts: Record<string, Transcript>;
  addTranscript: (transcript: Transcript) => void;
  getTranscript: (episodeId: string) => Transcript | undefined;
  getSegmentsNearTimestamp: (episodeId: string, timestampMs: number, windowMs: number) => TranscriptSegment[];
  searchTranscript: (episodeId: string, query: string) => TranscriptSegment[];
}

export const createTranscriptsSlice: StateCreator<TranscriptsSlice> = (set, get) => ({
  transcripts: {},

  addTranscript: (transcript) =>
    set((state) => ({
      transcripts: { ...state.transcripts, [transcript.episodeId]: transcript },
    })),

  getTranscript: (episodeId) => get().transcripts[episodeId],

  getSegmentsNearTimestamp: (episodeId, timestampMs, windowMs) => {
    const transcript = get().transcripts[episodeId];
    if (!transcript) return [];

    const start = timestampMs - windowMs;
    const end = timestampMs + windowMs;

    return transcript.segments.filter(
      (seg) => seg.startTime >= start && seg.endTime <= end
    );
  },

  searchTranscript: (episodeId, query) => {
    const transcript = get().transcripts[episodeId];
    if (!transcript) return [];

    const lowerQuery = query.toLowerCase();
    return transcript.segments.filter((seg) =>
      seg.text.toLowerCase().includes(lowerQuery)
    );
  },
});
