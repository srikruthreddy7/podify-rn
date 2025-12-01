import { VoiceIntent, IntentType, VoiceCommand } from '../types';
import { AudioPlayerService } from '../services/audioPlayer';
import { useStore } from '../store';
import { config } from '../utils/config';

export class IntentRouter {
  private static commandHistory: VoiceCommand[] = [];

  /**
   * Parse utterance into structured intent
   * This is a simple pattern-based parser. In production, this would use the LLM
   * on the server side to parse intents more robustly.
   */
  static parseIntent(utterance: string): VoiceIntent {
    const lower = utterance.toLowerCase().trim();

    // Pause/Resume
    if (/^(pause|stop)/.test(lower)) {
      return { type: 'pause', utterance, confidence: 0.9 };
    }
    if (/^(play|resume|continue)/.test(lower)) {
      return { type: 'resume', utterance, confidence: 0.9 };
    }

    // Seeking
    if (/back|rewind|backward/.test(lower) && /15|fifteen/.test(lower)) {
      return { type: 'seek_backward', utterance, confidence: 0.85 };
    }
    if (/forward|ahead/.test(lower) && /15|fifteen/.test(lower)) {
      return { type: 'seek_forward', utterance, confidence: 0.85 };
    }

    // Speed control
    const speedMatch = lower.match(/(?:set )?speed (?:to )?(\d+\.?\d*)/);
    if (speedMatch) {
      const rate = parseFloat(speedMatch[1]);
      return { type: 'set_speed', parameters: { rate }, utterance, confidence: 0.9 };
    }

    // Chapter navigation
    if (/next chapter/.test(lower)) {
      return { type: 'next_chapter', utterance, confidence: 0.85 };
    }
    if (/previous chapter|last chapter/.test(lower)) {
      return { type: 'previous_chapter', utterance, confidence: 0.85 };
    }

    // Bookmarks
    if (/bookmark this|save (?:this )?(?:spot|position)/.test(lower)) {
      return { type: 'bookmark', utterance, confidence: 0.9 };
    }
    if (/show bookmarks|list bookmarks/.test(lower)) {
      return { type: 'show_bookmarks', utterance, confidence: 0.9 };
    }

    // Rewind and play
    if (/what (?:did|was) (?:they|he|she) (?:just )?say/.test(lower)) {
      return { type: 'rewind_and_play', utterance, confidence: 0.85 };
    }

    // Summarize
    if (/summarize|summary/.test(lower) && /last (?:minute|few minutes)/.test(lower)) {
      return { type: 'summarize', utterance, confidence: 0.8 };
    }

    // Explain/Question
    if (/explain|what is|what's|tell me about/.test(lower)) {
      const topicMatch = lower.match(/(?:explain|what is|what's|tell me about) (.+)/);
      const topic = topicMatch ? topicMatch[1] : '';
      return { type: 'explain', parameters: { topic }, utterance, confidence: 0.75 };
    }

    // Jump to timestamp
    const jumpMatch = lower.match(/jump to (\d+):(\d+)/);
    if (jumpMatch) {
      const minutes = parseInt(jumpMatch[1]);
      const seconds = parseInt(jumpMatch[2]);
      const timestampMs = (minutes * 60 + seconds) * 1000;
      return { type: 'jump_to', parameters: { timestampMs }, utterance, confidence: 0.9 };
    }

    // Default: unknown intent
    return { type: 'unknown', utterance, confidence: 0 };
  }

  /**
   * Execute an intent and return result
   */
  static async executeIntent(intent: VoiceIntent): Promise<any> {
    const command: VoiceCommand = {
      intent,
      timestamp: Date.now(),
      executed: false,
    };

    try {
      let result: any;

      switch (intent.type) {
        case 'pause':
          await AudioPlayerService.pause();
          useStore.getState().setPlaying(false);
          result = { success: true, message: 'Paused' };
          break;

        case 'resume':
          await AudioPlayerService.play();
          useStore.getState().setPlaying(true);
          result = { success: true, message: 'Playing' };
          break;

        case 'seek_backward':
          await AudioPlayerService.jumpBackward();
          result = { success: true, message: 'Rewound 15 seconds' };
          break;

        case 'seek_forward':
          await AudioPlayerService.jumpForward();
          result = { success: true, message: 'Forwarded 15 seconds' };
          break;

        case 'set_speed':
          const rate = intent.parameters?.rate || 1.0;
          await AudioPlayerService.setRate(rate);
          useStore.getState().setRate(rate);
          result = { success: true, message: `Speed set to ${rate}x` };
          break;

        case 'next_chapter':
          result = await this.navigateToChapter('next');
          break;

        case 'previous_chapter':
          result = await this.navigateToChapter('previous');
          break;

        case 'bookmark':
          result = await this.createBookmark();
          break;

        case 'show_bookmarks':
          result = this.getBookmarks();
          break;

        case 'rewind_and_play':
          await AudioPlayerService.seekBy(-15000);
          await AudioPlayerService.play();
          result = { success: true, message: 'Rewinding and playing' };
          break;

        case 'summarize':
          result = await this.summarizeRecent();
          break;

        case 'explain':
        case 'question':
          result = await this.answerQuestion(intent.parameters?.topic || intent.utterance);
          break;

        case 'jump_to':
          const timestampMs = intent.parameters?.timestampMs || 0;
          await AudioPlayerService.seekTo(timestampMs);
          result = { success: true, message: `Jumped to ${this.formatTimestamp(timestampMs)}` };
          break;

        default:
          result = { success: false, message: 'Unknown command', needsServerProcessing: true };
      }

      command.executed = true;
      command.result = result;
      this.commandHistory.push(command);

      return result;
    } catch (error: any) {
      command.error = error.message;
      this.commandHistory.push(command);
      throw error;
    }
  }

  private static async navigateToChapter(direction: 'next' | 'previous'): Promise<any> {
    const { playback } = useStore.getState();
    const episode = useStore.getState().getEpisode(playback.episodeId || '');

    if (!episode?.chapters || episode.chapters.length === 0) {
      return { success: false, message: 'No chapters available' };
    }

    const currentPosition = playback.position;
    const chapters = episode.chapters;

    if (direction === 'next') {
      const nextChapter = chapters.find((ch) => ch.startTime > currentPosition);
      if (nextChapter) {
        await AudioPlayerService.seekTo(nextChapter.startTime);
        return { success: true, message: `Skipped to: ${nextChapter.title}` };
      }
      return { success: false, message: 'No next chapter' };
    } else {
      const previousChapters = chapters.filter((ch) => ch.startTime < currentPosition);
      const previousChapter = previousChapters[previousChapters.length - 1];
      if (previousChapter) {
        await AudioPlayerService.seekTo(previousChapter.startTime);
        return { success: true, message: `Returned to: ${previousChapter.title}` };
      }
      return { success: false, message: 'No previous chapter' };
    }
  }

  private static async createBookmark(): Promise<any> {
    const { playback, addBookmark } = useStore.getState();

    if (!playback.episodeId) {
      return { success: false, message: 'No episode playing' };
    }

    addBookmark({
      episodeId: playback.episodeId,
      timestamp: playback.position,
    });

    return { success: true, message: 'Bookmark created' };
  }

  private static getBookmarks(): any {
    const { playback, getBookmarksByEpisode } = useStore.getState();

    if (!playback.episodeId) {
      return { success: false, message: 'No episode playing' };
    }

    const bookmarks = getBookmarksByEpisode(playback.episodeId);
    return { success: true, bookmarks };
  }

  private static async summarizeRecent(): Promise<any> {
    // This would call the server Q&A endpoint with a summarization request
    const { playback } = useStore.getState();

    return {
      success: true,
      needsServerProcessing: true,
      context: {
        episodeId: playback.episodeId,
        playheadMs: playback.position,
        request: 'summarize_last_minute',
      },
    };
  }

  private static async answerQuestion(query: string): Promise<any> {
    // This would call the server Q&A endpoint
    const { playback } = useStore.getState();

    return {
      success: true,
      needsServerProcessing: true,
      context: {
        episodeId: playback.episodeId,
        playheadMs: playback.position,
        query,
      },
    };
  }

  private static formatTimestamp(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  static getCommandHistory(): VoiceCommand[] {
    return this.commandHistory;
  }

  static clearCommandHistory(): void {
    this.commandHistory = [];
  }
}
