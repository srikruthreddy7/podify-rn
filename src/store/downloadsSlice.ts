import { StateCreator } from 'zustand';
import { DownloadState } from '../types';

export interface DownloadsSlice {
  downloads: Record<string, DownloadState>;
  setDownloadState: (state: DownloadState) => void;
  updateDownloadProgress: (episodeId: string, progress: number) => void;
  removeDownload: (episodeId: string) => void;
  getDownload: (episodeId: string) => DownloadState | undefined;
  isDownloaded: (episodeId: string) => boolean;
}

export const createDownloadsSlice: StateCreator<DownloadsSlice> = (set, get) => ({
  downloads: {},

  setDownloadState: (state) =>
    set((prev) => ({
      downloads: { ...prev.downloads, [state.episodeId]: state },
    })),

  updateDownloadProgress: (episodeId, progress) =>
    set((prev) => ({
      downloads: {
        ...prev.downloads,
        [episodeId]: {
          ...prev.downloads[episodeId],
          progress,
        },
      },
    })),

  removeDownload: (episodeId) =>
    set((state) => {
      const { [episodeId]: _, ...remaining } = state.downloads;
      return { downloads: remaining };
    }),

  getDownload: (episodeId) => get().downloads[episodeId],

  isDownloaded: (episodeId) => {
    const download = get().downloads[episodeId];
    return download?.status === 'completed' && !!download.localUri;
  },
});
