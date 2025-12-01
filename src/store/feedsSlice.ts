import { StateCreator } from 'zustand';
import { PodcastShow, Episode } from '../types';

export interface FeedsSlice {
  shows: Record<string, PodcastShow>;
  episodes: Record<string, Episode>;
  addShow: (show: PodcastShow) => void;
  updateShow: (showId: string, updates: Partial<PodcastShow>) => void;
  removeShow: (showId: string) => void;
  addEpisodes: (episodes: Episode[]) => void;
  getEpisodesByShow: (showId: string) => Episode[];
  getShow: (showId: string) => PodcastShow | undefined;
  getEpisode: (episodeId: string) => Episode | undefined;
}

export const createFeedsSlice: StateCreator<FeedsSlice> = (set, get) => ({
  shows: {},
  episodes: {},

  addShow: (show) =>
    set((state) => ({
      shows: { ...state.shows, [show.id]: show },
    })),

  updateShow: (showId, updates) =>
    set((state) => ({
      shows: {
        ...state.shows,
        [showId]: { ...state.shows[showId], ...updates },
      },
    })),

  removeShow: (showId) =>
    set((state) => {
      const { [showId]: _, ...remainingShows } = state.shows;
      // Also remove associated episodes
      const remainingEpisodes = Object.fromEntries(
        Object.entries(state.episodes).filter(([, ep]) => ep.showId !== showId)
      );
      return {
        shows: remainingShows,
        episodes: remainingEpisodes,
      };
    }),

  addEpisodes: (episodes) =>
    set((state) => ({
      episodes: {
        ...state.episodes,
        ...Object.fromEntries(episodes.map((ep) => [ep.id, ep])),
      },
    })),

  getEpisodesByShow: (showId) => {
    const episodes = get().episodes;
    return Object.values(episodes)
      .filter((ep) => ep.showId === showId)
      .sort((a, b) => b.publishDate - a.publishDate);
  },

  getShow: (showId) => get().shows[showId],

  getEpisode: (episodeId) => get().episodes[episodeId],
});
