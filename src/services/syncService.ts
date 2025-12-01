import { supabase } from '../utils/supabase';
import { 
  ListeningHistory, 
  ListeningHistoryInsert, 
  PlaybackProgress, 
  PlaybackProgressInsert,
  UserSubscription,
  UserSubscriptionInsert 
} from '../types/database';
import { Episode, PodcastShow } from '../types';

class SyncService {
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private pendingProgressUpdate: PlaybackProgressInsert | null = null;

  /**
   * Save or update playback progress for an episode
   * Uses debouncing to avoid too many database writes
   */
  async savePlaybackProgress(
    userId: string,
    episodeId: string,
    position: number,
    duration: number,
    playbackRate: number = 1.0
  ): Promise<void> {
    // Store the pending update
    this.pendingProgressUpdate = {
      user_id: userId,
      episode_id: episodeId,
      position,
      duration,
      playback_rate: playbackRate,
    };

    // Clear existing timer
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    // Debounce to avoid too many writes (save every 5 seconds)
    this.syncDebounceTimer = setTimeout(async () => {
      if (this.pendingProgressUpdate) {
        await this.flushPlaybackProgress();
      }
    }, 5000);
  }

  /**
   * Immediately flush any pending playback progress
   * Call this when the app is backgrounded or episode changes
   */
  async flushPlaybackProgress(): Promise<void> {
    if (!this.pendingProgressUpdate) return;

    const update = this.pendingProgressUpdate;
    this.pendingProgressUpdate = null;

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }

    try {
      const { error } = await supabase
        .from('playback_progress')
        .upsert(update, {
          onConflict: 'user_id,episode_id',
        });

      if (error) {
        console.error('Error saving playback progress:', error);
      }
    } catch (error) {
      console.error('Error flushing playback progress:', error);
    }
  }

  /**
   * Get playback progress for an episode
   */
  async getPlaybackProgress(userId: string, episodeId: string): Promise<PlaybackProgress | null> {
    try {
      const { data, error } = await supabase
        .from('playback_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('episode_id', episodeId)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found is okay
          console.error('Error getting playback progress:', error);
        }
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting playback progress:', error);
      return null;
    }
  }

  /**
   * Get all playback progress for a user (for showing "Continue Listening")
   */
  async getAllPlaybackProgress(userId: string): Promise<PlaybackProgress[]> {
    try {
      const { data, error } = await supabase
        .from('playback_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error getting all playback progress:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting all playback progress:', error);
      return [];
    }
  }

  /**
   * Add episode to listening history
   */
  async addToListeningHistory(
    userId: string,
    episode: Episode,
    show: PodcastShow
  ): Promise<void> {
    try {
      const historyEntry: ListeningHistoryInsert = {
        user_id: userId,
        episode_id: episode.id,
        show_id: show.id,
        episode_title: episode.title,
        show_title: show.title,
        episode_image_url: episode.imageUrl || null,
        show_image_url: show.imageUrl,
        audio_url: episode.audioUrl,
        duration: episode.duration * 1000, // Convert to milliseconds
      };

      const { error } = await supabase
        .from('listening_history')
        .upsert(historyEntry, {
          onConflict: 'user_id,episode_id',
        });

      if (error) {
        console.error('Error adding to listening history:', error);
      }
    } catch (error) {
      console.error('Error adding to listening history:', error);
    }
  }

  /**
   * Update listening history (e.g., mark as completed)
   */
  async updateListeningHistory(
    userId: string,
    episodeId: string,
    updates: { completed?: boolean; last_played_at?: string }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('listening_history')
        .update({
          ...updates,
          last_played_at: updates.last_played_at || new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('episode_id', episodeId);

      if (error) {
        console.error('Error updating listening history:', error);
      }
    } catch (error) {
      console.error('Error updating listening history:', error);
    }
  }

  /**
   * Get listening history for a user
   */
  async getListeningHistory(userId: string, limit: number = 50): Promise<ListeningHistory[]> {
    try {
      const { data, error } = await supabase
        .from('listening_history')
        .select('*')
        .eq('user_id', userId)
        .order('last_played_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting listening history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting listening history:', error);
      return [];
    }
  }

  /**
   * Get recently played (not completed) episodes
   */
  async getRecentlyPlayed(userId: string, limit: number = 10): Promise<ListeningHistory[]> {
    try {
      const { data, error } = await supabase
        .from('listening_history')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .order('last_played_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting recently played:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting recently played:', error);
      return [];
    }
  }

  /**
   * Subscribe to a podcast show
   */
  async subscribeToShow(userId: string, show: PodcastShow): Promise<void> {
    try {
      const subscription: UserSubscriptionInsert = {
        user_id: userId,
        show_id: show.id,
        show_title: show.title,
        show_author: show.author,
        show_image_url: show.imageUrl,
        feed_url: show.feedUrl,
      };

      const { error } = await supabase
        .from('user_subscriptions')
        .upsert(subscription, {
          onConflict: 'user_id,show_id',
        });

      if (error) {
        console.error('Error subscribing to show:', error);
      }
    } catch (error) {
      console.error('Error subscribing to show:', error);
    }
  }

  /**
   * Unsubscribe from a podcast show
   */
  async unsubscribeFromShow(userId: string, showId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('show_id', showId);

      if (error) {
        console.error('Error unsubscribing from show:', error);
      }
    } catch (error) {
      console.error('Error unsubscribing from show:', error);
    }
  }

  /**
   * Get user's subscribed shows
   */
  async getSubscriptions(userId: string): Promise<UserSubscription[]> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('subscribed_at', { ascending: false });

      if (error) {
        console.error('Error getting subscriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return [];
    }
  }

  /**
   * Check if user is subscribed to a show
   */
  async isSubscribed(userId: string, showId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('show_id', showId)
        .single();

      if (error) {
        return false;
      }

      return !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete playback progress (e.g., when user clears history)
   */
  async deletePlaybackProgress(userId: string, episodeId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('playback_progress')
        .delete()
        .eq('user_id', userId)
        .eq('episode_id', episodeId);

      if (error) {
        console.error('Error deleting playback progress:', error);
      }
    } catch (error) {
      console.error('Error deleting playback progress:', error);
    }
  }

  /**
   * Clear all listening history for a user
   */
  async clearListeningHistory(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('listening_history')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error clearing listening history:', error);
      }
    } catch (error) {
      console.error('Error clearing listening history:', error);
    }
  }
}

export const syncService = new SyncService();


