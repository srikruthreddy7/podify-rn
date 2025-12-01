import { TranscriptService } from '../src/services/transcriptService';
import { Transcript } from '../src/types';

describe('TranscriptService', () => {
  const sampleSRT = `1
00:00:00,000 --> 00:00:05,500
Welcome to the show.

2
00:00:05,500 --> 00:00:12,000
Today we discuss AI and machine learning.

3
00:00:12,000 --> 00:00:18,500
Let's dive into the technical details.`;

  describe('parseSRT', () => {
    it('should parse SRT format correctly', async () => {
      // Access private method via parsing a fetched transcript
      // In practice, we'd mock fetch, but for simplicity we test the logic
      const segments = (TranscriptService as any).parseSRT(sampleSRT);

      expect(segments).toHaveLength(3);
      expect(segments[0].startTime).toBe(0);
      expect(segments[0].endTime).toBe(5500);
      expect(segments[0].text).toBe('Welcome to the show.');

      expect(segments[1].startTime).toBe(5500);
      expect(segments[1].text).toContain('AI and machine learning');
    });
  });

  describe('getSegmentsNearTimestamp', () => {
    it('should return segments within time window', () => {
      const transcript: Transcript = {
        episodeId: 'ep1',
        segments: [
          { startTime: 0, endTime: 5000, text: 'First' },
          { startTime: 5000, endTime: 10000, text: 'Second' },
          { startTime: 10000, endTime: 15000, text: 'Third' },
          { startTime: 15000, endTime: 20000, text: 'Fourth' },
          { startTime: 20000, endTime: 25000, text: 'Fifth' },
        ],
        type: 'srt',
        lastUpdated: Date.now(),
      };

      const segments = TranscriptService.getSegmentsNearTimestamp(
        transcript,
        10000,
        5000
      );

      // Should get segments from 5000-15000
      expect(segments).toHaveLength(2);
      expect(segments[0].text).toBe('Second');
      expect(segments[1].text).toBe('Third');
    });
  });

  describe('searchTranscript', () => {
    it('should find matching segments', () => {
      const transcript: Transcript = {
        episodeId: 'ep1',
        segments: [
          { startTime: 0, endTime: 5000, text: 'Welcome to the show' },
          { startTime: 5000, endTime: 10000, text: 'Today we discuss AI' },
          { startTime: 10000, endTime: 15000, text: 'Machine learning is fascinating' },
        ],
        type: 'srt',
        lastUpdated: Date.now(),
      };

      const results = TranscriptService.searchTranscript(transcript, 'AI');

      expect(results).toHaveLength(1);
      expect(results[0].text).toContain('AI');
    });

    it('should be case insensitive', () => {
      const transcript: Transcript = {
        episodeId: 'ep1',
        segments: [
          { startTime: 0, endTime: 5000, text: 'Machine Learning' },
        ],
        type: 'srt',
        lastUpdated: Date.now(),
      };

      const results = TranscriptService.searchTranscript(transcript, 'machine learning');

      expect(results).toHaveLength(1);
    });
  });

  describe('getSegmentAtTimestamp', () => {
    it('should return the current segment', () => {
      const transcript: Transcript = {
        episodeId: 'ep1',
        segments: [
          { startTime: 0, endTime: 5000, text: 'First' },
          { startTime: 5000, endTime: 10000, text: 'Second' },
          { startTime: 10000, endTime: 15000, text: 'Third' },
        ],
        type: 'srt',
        lastUpdated: Date.now(),
      };

      const segment = TranscriptService.getSegmentAtTimestamp(transcript, 7500);

      expect(segment?.text).toBe('Second');
    });

    it('should return null if no segment found', () => {
      const transcript: Transcript = {
        episodeId: 'ep1',
        segments: [
          { startTime: 0, endTime: 5000, text: 'First' },
        ],
        type: 'srt',
        lastUpdated: Date.now(),
      };

      const segment = TranscriptService.getSegmentAtTimestamp(transcript, 10000);

      expect(segment).toBeNull();
    });
  });
});
