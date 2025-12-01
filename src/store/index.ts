import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPlayerSlice, PlayerSlice } from './playerSlice';
import { createFeedsSlice, FeedsSlice } from './feedsSlice';
import { createTranscriptsSlice, TranscriptsSlice } from './transcriptsSlice';
import { createBookmarksSlice, BookmarksSlice } from './bookmarksSlice';
import { createDownloadsSlice, DownloadsSlice } from './downloadsSlice';
import { createThemeSlice, ThemeSlice } from './themeSlice';
import { createAuthSlice, AuthSlice } from './authSlice';

// Combined store type
export type AppStore = PlayerSlice & FeedsSlice & TranscriptsSlice & BookmarksSlice & DownloadsSlice & ThemeSlice & AuthSlice;

// Create the combined store with persistence
export const useStore = create<AppStore>()(
  persist(
    (...a) => ({
      ...createPlayerSlice(...a),
      ...createFeedsSlice(...a),
      ...createTranscriptsSlice(...a),
      ...createBookmarksSlice(...a),
      ...createDownloadsSlice(...a),
      ...createThemeSlice(...a),
      ...createAuthSlice(...a),
    }),
    {
      name: 'podcast-assist-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these slices (don't persist playback state or auth which is managed by Supabase)
      partialize: (state) => ({
        shows: state.shows,
        episodes: state.episodes,
        bookmarks: state.bookmarks,
        downloads: state.downloads,
        transcripts: state.transcripts,
        themeMode: state.themeMode,
      }),
    }
  )
);
