import TrackPlayer, {
  Capability,
  Event,
  RepeatMode,
  State,
  Track,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player';
import { Episode } from '../types';
import { config } from '../utils/config';

export class AudioPlayerService {
  private static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    try {
      await TrackPlayer.setupPlayer();

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.JumpForward,
          Capability.JumpBackward,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.JumpForward,
          Capability.JumpBackward,
        ],
        forwardJumpInterval: config.audio.seekInterval / 1000, // convert to seconds
        backwardJumpInterval: config.audio.seekInterval / 1000,
      });

      await TrackPlayer.setRepeatMode(RepeatMode.Off);

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize audio player:', error);
      throw error;
    }
  }

  static episodeToTrack(episode: Episode, showAuthor?: string, localUri?: string): Track {
    return {
      id: episode.id,
      url: localUri || episode.audioUrl,
      title: episode.title,
      artist: showAuthor || 'Podcast',
      artwork: episode.imageUrl,
      duration: episode.duration,
    };
  }

  static async loadEpisode(episode: Episode, showAuthor?: string, localUri?: string, startPosition = 0) {
    await this.initialize();

    const track = this.episodeToTrack(episode, showAuthor, localUri);
    await TrackPlayer.reset();
    await TrackPlayer.add(track);

    if (startPosition > 0) {
      await TrackPlayer.seekTo(startPosition / 1000); // convert ms to seconds
    }
  }

  static async play() {
    await TrackPlayer.play();
  }

  static async pause() {
    await TrackPlayer.pause();
  }

  static async togglePlayPause() {
    const state = await TrackPlayer.getState();
    if (state === State.Playing) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  static async seekTo(positionMs: number) {
    await TrackPlayer.seekTo(positionMs / 1000);
  }

  static async seekBy(deltaMs: number) {
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(position + deltaMs / 1000);
  }

  static async setRate(rate: number) {
    await TrackPlayer.setRate(rate);
  }

  static async getPosition(): Promise<number> {
    const position = await TrackPlayer.getPosition();
    return position * 1000; // convert to ms
  }

  static async getDuration(): Promise<number> {
    const duration = await TrackPlayer.getDuration();
    return duration * 1000; // convert to ms
  }

  static async getState(): Promise<State> {
    return await TrackPlayer.getState();
  }

  // Jump forward by configured interval (default 15s)
  static async jumpForward() {
    await this.seekBy(config.audio.seekInterval);
  }

  // Jump backward by configured interval (default 15s)
  static async jumpBackward() {
    await this.seekBy(-config.audio.seekInterval);
  }
}

// Playback service for background audio
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => AudioPlayerService.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => AudioPlayerService.pause());
  TrackPlayer.addEventListener(Event.RemoteJumpForward, () => AudioPlayerService.jumpForward());
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => AudioPlayerService.jumpBackward());
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => AudioPlayerService.seekTo(position * 1000));
}
