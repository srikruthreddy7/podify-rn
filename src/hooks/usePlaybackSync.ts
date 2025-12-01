import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { syncService } from '../services/syncService';
import { Episode, PodcastShow } from '../types';

/**
 * Hook to sync playback progress to Supabase
 * Automatically syncs when:
 * - Playback position changes (debounced)
 * - App goes to background
 * - Episode changes
 */
export function usePlaybackSync() {
  const { user } = useAuth();
  const { playback, shows, episodes } = useStore();
  const previousEpisodeId = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);

  // Get the current episode and show
  const getCurrentEpisodeAndShow = useCallback((): { episode: Episode | null; show: PodcastShow | null } => {
    if (!playback.episodeId) {
      return { episode: null, show: null };
    }

    const episode = episodes[playback.episodeId];
    if (!episode) {
      return { episode: null, show: null };
    }

    const show = shows[episode.showId];
    return { episode, show: show || null };
  }, [playback.episodeId, episodes, shows]);

  // Sync playback progress
  const syncProgress = useCallback(async () => {
    if (!user || !playback.episodeId) return;

    await syncService.savePlaybackProgress(
      user.id,
      playback.episodeId,
      playback.position,
      playback.duration,
      playback.rate
    );
  }, [user, playback.episodeId, playback.position, playback.duration, playback.rate]);

  // Add to listening history when starting a new episode
  const addToHistory = useCallback(async () => {
    if (!user || !playback.episodeId) return;

    const { episode, show } = getCurrentEpisodeAndShow();
    if (!episode || !show) return;

    await syncService.addToListeningHistory(user.id, episode, show);
  }, [user, playback.episodeId, getCurrentEpisodeAndShow]);

  // Mark as completed when near the end
  const checkCompletion = useCallback(async () => {
    if (!user || !playback.episodeId) return;

    // Consider completed if within last 30 seconds or 98% of duration
    const nearEnd = playback.duration > 0 && (
      playback.position >= playback.duration - 30000 ||
      playback.position >= playback.duration * 0.98
    );

    if (nearEnd) {
      await syncService.updateListeningHistory(user.id, playback.episodeId, {
        completed: true,
      });
    }
  }, [user, playback.episodeId, playback.position, playback.duration]);

  // Handle app state changes (flush progress when going to background)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App is going to background - flush progress
        await syncService.flushPlaybackProgress();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Handle episode changes
  useEffect(() => {
    if (playback.episodeId !== previousEpisodeId.current) {
      // Episode changed
      if (previousEpisodeId.current && user) {
        // Flush progress for previous episode
        syncService.flushPlaybackProgress();
      }

      if (playback.episodeId && user) {
        // Add new episode to listening history
        addToHistory();
      }

      previousEpisodeId.current = playback.episodeId;
    }
  }, [playback.episodeId, user, addToHistory]);

  // Sync progress periodically when playing
  useEffect(() => {
    if (!user || !playback.isPlaying || !playback.episodeId) return;

    syncProgress();
    checkCompletion();
  }, [user, playback.isPlaying, playback.position, syncProgress, checkCompletion]);

  // Return useful functions for manual syncing
  return {
    syncProgress,
    flushProgress: syncService.flushPlaybackProgress.bind(syncService),
    addToHistory,
  };
}

/**
 * Hook to restore playback position from Supabase
 */
export function useRestorePlayback() {
  const { user } = useAuth();
  const { setPlayback } = useStore();

  const restorePosition = useCallback(async (episodeId: string): Promise<number> => {
    if (!user) return 0;

    const progress = await syncService.getPlaybackProgress(user.id, episodeId);
    if (progress) {
      return progress.position;
    }
    return 0;
  }, [user]);

  const restoreAndSetPosition = useCallback(async (episodeId: string) => {
    const position = await restorePosition(episodeId);
    if (position > 0) {
      setPlayback({ position });
    }
    return position;
  }, [restorePosition, setPlayback]);

  return {
    restorePosition,
    restoreAndSetPosition,
  };
}


