import { Transcript, TranscriptSegment } from '../types';
import { config } from '../utils/config';

export class TranscriptService {
  /**
   * Fetch and parse transcript from URL
   */
  static async fetchTranscript(
    episodeId: string,
    transcriptUrl: string,
    type: 'application/srt' | 'application/json' | 'text/vtt' = 'application/srt'
  ): Promise<Transcript> {
    try {
      const response = await fetch(transcriptUrl);
      const text = await response.text();

      let segments: TranscriptSegment[];

      if (type === 'application/srt' || type === 'text/vtt') {
        segments = this.parseSRT(text);
      } else if (type === 'application/json') {
        segments = this.parseJSON(text);
      } else {
        throw new Error(`Unsupported transcript type: ${type}`);
      }

      return {
        episodeId,
        segments,
        type: type === 'application/srt' ? 'srt' : type === 'text/vtt' ? 'vtt' : 'json',
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
      throw error;
    }
  }

  /**
   * Parse SRT format transcript
   */
  private static parseSRT(srtText: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const blocks = srtText.trim().split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length < 3) continue;

      // Line 0: index number
      // Line 1: timestamp (00:00:10,500 --> 00:00:13,000)
      // Line 2+: text

      const timeLine = lines[1];
      const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);

      if (!timeMatch) continue;

      const startTime =
        parseInt(timeMatch[1]) * 3600000 +
        parseInt(timeMatch[2]) * 60000 +
        parseInt(timeMatch[3]) * 1000 +
        parseInt(timeMatch[4]);

      const endTime =
        parseInt(timeMatch[5]) * 3600000 +
        parseInt(timeMatch[6]) * 60000 +
        parseInt(timeMatch[7]) * 1000 +
        parseInt(timeMatch[8]);

      const text = lines.slice(2).join(' ');

      segments.push({ startTime, endTime, text });
    }

    return segments;
  }

  /**
   * Parse JSON format transcript (custom or Podcasting 2.0 format)
   */
  private static parseJSON(jsonText: string): TranscriptSegment[] {
    const data = JSON.parse(jsonText);

    // Assuming format: { segments: [{start, end, text}] }
    if (Array.isArray(data.segments)) {
      return data.segments.map((seg: any) => ({
        startTime: seg.start * 1000, // assume seconds, convert to ms
        endTime: seg.end * 1000,
        text: seg.text,
        speaker: seg.speaker,
      }));
    }

    // Alternative format: array of segments
    if (Array.isArray(data)) {
      return data.map((seg: any) => ({
        startTime: seg.start * 1000,
        endTime: seg.end * 1000,
        text: seg.text,
        speaker: seg.speaker,
      }));
    }

    throw new Error('Unrecognized JSON transcript format');
  }

  /**
   * Request server-side ASR for an episode
   */
  static async requestASR(episodeId: string, audioUrl: string): Promise<Transcript> {
    try {
      const response = await fetch(`${config.server.url}/asr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episodeId, audioUrl }),
      });

      if (!response.ok) {
        throw new Error(`ASR request failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        episodeId,
        segments: data.segments,
        type: 'json',
        lastUpdated: Date.now(),
      };
    } catch (error) {
      console.error('Failed to request ASR:', error);
      throw error;
    }
  }

  /**
   * Get segments near a specific timestamp
   */
  static getSegmentsNearTimestamp(
    transcript: Transcript,
    timestampMs: number,
    windowMs: number = config.audio.transcriptContextWindow
  ): TranscriptSegment[] {
    const start = timestampMs - windowMs;
    const end = timestampMs + windowMs;

    return transcript.segments.filter(
      (seg) => seg.startTime >= start && seg.endTime <= end
    );
  }

  /**
   * Search transcript for a query
   */
  static searchTranscript(transcript: Transcript, query: string): TranscriptSegment[] {
    const lowerQuery = query.toLowerCase();
    return transcript.segments.filter((seg) =>
      seg.text.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get segment at specific timestamp
   */
  static getSegmentAtTimestamp(transcript: Transcript, timestampMs: number): TranscriptSegment | null {
    return transcript.segments.find(
      (seg) => seg.startTime <= timestampMs && seg.endTime >= timestampMs
    ) || null;
  }
}
