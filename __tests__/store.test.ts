import { useStore } from '../src/store';
import { PodcastShow, Episode, Bookmark } from '../src/types';

describe('Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({
      shows: {},
      episodes: {},
      transcripts: {},
      bookmarks: {},
      downloads: {},
      playback: {
        episodeId: null,
        position: 0,
        duration: 0,
        isPlaying: false,
        rate: 1.0,
        buffering: false,
      },
    });
  });

  describe('FeedsSlice', () => {
    it('should add a show', () => {
      const show: PodcastShow = {
        id: 'show1',
        title: 'Test Podcast',
        description: 'A test podcast',
        author: 'Test Author',
        imageUrl: 'https://example.com/image.jpg',
        feedUrl: 'https://example.com/feed.xml',
        lastUpdated: Date.now(),
      };

      useStore.getState().addShow(show);

      const storedShow = useStore.getState().getShow('show1');
      expect(storedShow).toEqual(show);
    });

    it('should add episodes', () => {
      const episodes: Episode[] = [
        {
          id: 'ep1',
          showId: 'show1',
          title: 'Episode 1',
          description: 'First episode',
          audioUrl: 'https://example.com/ep1.mp3',
          duration: 3600,
          publishDate: Date.now(),
        },
        {
          id: 'ep2',
          showId: 'show1',
          title: 'Episode 2',
          description: 'Second episode',
          audioUrl: 'https://example.com/ep2.mp3',
          duration: 3600,
          publishDate: Date.now() - 86400000,
        },
      ];

      useStore.getState().addEpisodes(episodes);

      const storedEpisodes = useStore.getState().getEpisodesByShow('show1');
      expect(storedEpisodes).toHaveLength(2);
      expect(storedEpisodes[0].id).toBe('ep1'); // Most recent first
    });
  });

  describe('PlayerSlice', () => {
    it('should update playback state', () => {
      useStore.getState().setPlayback({
        episodeId: 'ep1',
        isPlaying: true,
        duration: 360000,
      });

      const playback = useStore.getState().playback;
      expect(playback.episodeId).toBe('ep1');
      expect(playback.isPlaying).toBe(true);
      expect(playback.duration).toBe(360000);
    });

    it('should seek by delta', () => {
      useStore.getState().setPlayback({ position: 60000, duration: 360000 });
      useStore.getState().seekBy(15000);

      expect(useStore.getState().playback.position).toBe(75000);
    });

    it('should not seek beyond duration', () => {
      useStore.getState().setPlayback({ position: 350000, duration: 360000 });
      useStore.getState().seekBy(20000);

      expect(useStore.getState().playback.position).toBe(360000);
    });

    it('should not seek below zero', () => {
      useStore.getState().setPlayback({ position: 5000, duration: 360000 });
      useStore.getState().seekBy(-10000);

      expect(useStore.getState().playback.position).toBe(0);
    });
  });

  describe('BookmarksSlice', () => {
    it('should add a bookmark', () => {
      useStore.getState().addBookmark({
        episodeId: 'ep1',
        timestamp: 120000,
        note: 'Interesting point',
      });

      const bookmarks = useStore.getState().getBookmarksByEpisode('ep1');
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0].timestamp).toBe(120000);
      expect(bookmarks[0].note).toBe('Interesting point');
    });

    it('should remove a bookmark', () => {
      useStore.getState().addBookmark({
        episodeId: 'ep1',
        timestamp: 120000,
      });

      const bookmarks = useStore.getState().getBookmarksByEpisode('ep1');
      const bookmarkId = bookmarks[0].id;

      useStore.getState().removeBookmark(bookmarkId);

      const remainingBookmarks = useStore.getState().getBookmarksByEpisode('ep1');
      expect(remainingBookmarks).toHaveLength(0);
    });
  });

  describe('DownloadsSlice', () => {
    it('should track download state', () => {
      useStore.getState().setDownloadState({
        episodeId: 'ep1',
        status: 'downloading',
        progress: 0.5,
      });

      const download = useStore.getState().getDownload('ep1');
      expect(download?.status).toBe('downloading');
      expect(download?.progress).toBe(0.5);
    });

    it('should identify downloaded episodes', () => {
      useStore.getState().setDownloadState({
        episodeId: 'ep1',
        status: 'completed',
        progress: 1.0,
        localUri: 'file:///path/to/ep1.mp3',
      });

      expect(useStore.getState().isDownloaded('ep1')).toBe(true);
      expect(useStore.getState().isDownloaded('ep2')).toBe(false);
    });
  });
});
