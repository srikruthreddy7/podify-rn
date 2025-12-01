import { StateCreator } from 'zustand';
import { Bookmark } from '../types';

export interface BookmarksSlice {
  bookmarks: Record<string, Bookmark>;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (bookmarkId: string) => void;
  getBookmarksByEpisode: (episodeId: string) => Bookmark[];
  getAllBookmarks: () => Bookmark[];
}

export const createBookmarksSlice: StateCreator<BookmarksSlice> = (set, get) => ({
  bookmarks: {},

  addBookmark: (bookmark) => {
    const id = `${bookmark.episodeId}_${Date.now()}`;
    const fullBookmark: Bookmark = {
      ...bookmark,
      id,
      createdAt: Date.now(),
    };

    set((state) => ({
      bookmarks: { ...state.bookmarks, [id]: fullBookmark },
    }));
  },

  removeBookmark: (bookmarkId) =>
    set((state) => {
      const { [bookmarkId]: _, ...remaining } = state.bookmarks;
      return { bookmarks: remaining };
    }),

  getBookmarksByEpisode: (episodeId) =>
    Object.values(get().bookmarks)
      .filter((b) => b.episodeId === episodeId)
      .sort((a, b) => a.timestamp - b.timestamp),

  getAllBookmarks: () =>
    Object.values(get().bookmarks).sort((a, b) => b.createdAt - a.createdAt),
});
