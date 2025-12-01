import { supabase } from '../utils/supabase';
import {
  PodcastIndexTrendingResponse,
  PodcastIndexCategoriesResponse,
  PodcastIndexFeed,
  PodcastSearchResult,
} from '../types';

interface PodcastIndexRequest {
  action: 'trending' | 'search' | 'categories';
  params?: {
    max?: number;
    category?: string;
    lang?: string;
    term?: string;
  };
}

/**
 * Service for accessing the Podcast Index API via Supabase Edge Function
 * API Docs: https://podcastindex-org.github.io/docs-api/
 *
 * This service calls a secure Supabase Edge Function that handles authentication
 * and API calls to Podcast Index, keeping API credentials safe on the server.
 */
export class PodcastIndexService {
  private static readonly REQUEST_TIMEOUT = 15000; // 15 seconds

  /**
   * Call the Supabase Edge Function to interact with Podcast Index API
   */
  private async callEdgeFunction<T>(request: PodcastIndexRequest): Promise<T> {
    try {
      console.log(`Calling podcast-index edge function with action: ${request.action}`);

      const { data, error } = await supabase.functions.invoke('podcast-index', {
        body: request,
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to call podcast-index function');
      }

      if (!data) {
        throw new Error('No data returned from podcast-index function');
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Podcast Index API error: ${error.message}`);
      }
      throw new Error('Podcast Index API: Unknown error');
    }
  }

  /**
   * Get trending podcasts
   * @param max Maximum number of results (1-1000, default: 20)
   * @param category Optional category filter
   * @param lang Optional language filter (e.g., 'en', 'es')
   */
  async getTrendingPodcasts(
    max: number = 20,
    category?: string,
    lang?: string
  ): Promise<PodcastIndexFeed[]> {
    const response = await this.callEdgeFunction<PodcastIndexTrendingResponse>({
      action: 'trending',
      params: {
        max: Math.min(Math.max(max, 1), 1000),
        ...(category && { category }),
        ...(lang && { lang }),
      },
    });

    if (response.status !== 'true') {
      throw new Error('Failed to fetch trending podcasts');
    }

    return response.feeds;
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<PodcastIndexCategoriesResponse> {
    const response = await this.callEdgeFunction<PodcastIndexCategoriesResponse>({
      action: 'categories',
    });

    if (response.status !== 'true') {
      throw new Error('Failed to fetch categories');
    }

    return response;
  }

  /**
   * Search podcasts by term
   * @param term Search query
   * @param max Maximum results (default: 20)
   */
  async searchPodcasts(term: string, max: number = 20): Promise<PodcastIndexFeed[]> {
    if (!term || term.trim().length === 0) {
      throw new Error('Search term cannot be empty');
    }

    interface SearchResponse {
      status: string;
      feeds: PodcastIndexFeed[];
      count: number;
      description: string;
    }

    const response = await this.callEdgeFunction<SearchResponse>({
      action: 'search',
      params: {
        term: term.trim(),
        max: Math.min(Math.max(max, 1), 1000),
      },
    });

    if (response.status !== 'true') {
      throw new Error('Search failed');
    }

    return response.feeds;
  }

  /**
   * Convert Podcast Index Feed to our internal PodcastSearchResult format
   */
  static feedToSearchResult(feed: PodcastIndexFeed): PodcastSearchResult {
    // Get category names
    const categoryNames = Object.values(feed.categories || {}).join(', ');

    return {
      id: feed.id.toString(),
      title: feed.title,
      author: feed.author || feed.ownerName,
      description: feed.description,
      imageUrl: feed.artwork || feed.image,
      feedUrl: feed.url,
      websiteUrl: feed.link,
      genre: categoryNames || undefined,
      trackCount: feed.episodeCount,
    };
  }
}

// Export singleton instance
export const podcastIndexService = new PodcastIndexService();
