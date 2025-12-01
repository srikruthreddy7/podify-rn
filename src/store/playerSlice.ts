import { StateCreator } from 'zustand';
import { PlaybackState } from '../types';

export interface PlayerSlice {
  playback: PlaybackState;
  setPlayback: (state: Partial<PlaybackState>) => void;
  setPosition: (position: number) => void;
  setPlaying: (isPlaying: boolean) => void;
  setRate: (rate: number) => void;
  seekBy: (deltaMs: number) => void;
  resetPlayer: () => void;
}

const initialState: PlaybackState = {
  episodeId: null,
  position: 0,
  duration: 0,
  isPlaying: false,
  rate: 1.0,
  buffering: false,
};

export const createPlayerSlice: StateCreator<PlayerSlice> = (set) => ({
  playback: initialState,

  setPlayback: (state) =>
    set((prev) => ({
      playback: { ...prev.playback, ...state },
    })),

  setPosition: (position) =>
    set((prev) => ({
      playback: { ...prev.playback, position },
    })),

  setPlaying: (isPlaying) =>
    set((prev) => ({
      playback: { ...prev.playback, isPlaying },
    })),

  setRate: (rate) =>
    set((prev) => ({
      playback: { ...prev.playback, rate },
    })),

  seekBy: (deltaMs) =>
    set((prev) => ({
      playback: {
        ...prev.playback,
        position: Math.max(0, Math.min(prev.playback.duration, prev.playback.position + deltaMs)),
      },
    })),

  resetPlayer: () => set({ playback: initialState }),
});
