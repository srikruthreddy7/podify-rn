import { ITunesSearchResponse, ITunesSearchResult, PodcastSearchResult } from '../types';

/**
 * Service for searching podcasts using Apple's iTunes Search API
 */
export class ITunesSearchService {
  private static readonly BASE_URL = 'https://itunes.apple.com/search';
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  /**
   * Search for podcasts by term
   * @param term Search query (podcast name, author, etc.)
   * @param limit Maximum number of results (default: 20)
   * @param country Country code for results (default: 'US')
   * @returns Array of podcast search results
   */
  async searchPodcasts(
    term: string,
    limit: number = ITunesSearchService.DEFAULT_LIMIT,
    country: string = 'US'
  ): Promise<PodcastSearchResult[]> {
    if (!term || term.trim().length === 0) {
      throw new Error('Search term cannot be empty');
    }

    try {
      const url = this.buildSearchUrl(term, limit, country);
      console.log(`Searching iTunes API: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ITunesSearchService.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`iTunes API request failed: ${response.status} ${response.statusText}`);
      }

      const data: ITunesSearchResponse = await response.json();
      console.log(`iTunes API returned ${data.resultCount} results`);

      return this.mapITunesResultsToPodcastSearchResults(data.results);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Search request timed out');
        }
        throw new Error(`Failed to search podcasts: ${error.message}`);
      }
      throw new Error('Failed to search podcasts: Unknown error');
    }
  }

  /**
   * Get podcast details by iTunes ID
   * @param podcastId iTunes collection ID
   * @param country Country code (default: 'US')
   * @returns Podcast search result or null if not found
   */
  async getPodcastById(
    podcastId: number,
    country: string = 'US'
  ): Promise<PodcastSearchResult | null> {
    try {
      const url = this.buildLookupUrl(podcastId, country);
      console.log(`Looking up podcast by ID: ${podcastId}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ITunesSearchService.REQUEST_TIMEOUT);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`iTunes API lookup failed: ${response.status} ${response.statusText}`);
      }

      const data: ITunesSearchResponse = await response.json();

      if (data.resultCount === 0) {
        return null;
      }

      const results = this.mapITunesResultsToPodcastSearchResults(data.results);
      return results[0] || null;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Lookup request timed out');
        }
        throw new Error(`Failed to lookup podcast: ${error.message}`);
      }
      throw new Error('Failed to lookup podcast: Unknown error');
    }
  }

  /**
   * Build the iTunes Search API URL
   */
  private buildSearchUrl(term: string, limit: number, country: string): string {
    const params = new URLSearchParams({
      term: term.trim(),
      media: 'podcast',
      entity: 'podcast',
      limit: limit.toString(),
      country: country,
    });

    return `${ITunesSearchService.BASE_URL}?${params.toString()}`;
  }

  /**
   * Build the iTunes Lookup API URL
   */
  private buildLookupUrl(podcastId: number, country: string): string {
    const params = new URLSearchParams({
      id: podcastId.toString(),
      entity: 'podcast',
      country: country,
    });

    return `https://itunes.apple.com/lookup?${params.toString()}`;
  }

  /**
   * Map iTunes API results to our internal PodcastSearchResult format
   */
  private mapITunesResultsToPodcastSearchResults(
    results: ITunesSearchResult[]
  ): PodcastSearchResult[] {
    return results
      .filter(result => result.feedUrl) // Only include results with RSS feed URLs
      .map(result => this.mapSingleResult(result));
  }

  /**
   * Map a single iTunes result to PodcastSearchResult
   */
  private mapSingleResult(result: ITunesSearchResult): PodcastSearchResult {
    // Get the highest quality artwork available
    const imageUrl = this.getHighestQualityArtwork(result);

    return {
      id: result.collectionId.toString(),
      title: result.collectionName || result.trackName,
      author: result.artistName,
      description: '', // iTunes API doesn't provide descriptions - will be fetched from RSS
      imageUrl,
      feedUrl: result.feedUrl,
      websiteUrl: result.collectionViewUrl || result.trackViewUrl,
      genre: result.primaryGenreName,
      trackCount: result.trackCount,
    };
  }

  /**
   * Get the highest quality artwork URL available
   */
  private getHighestQualityArtwork(result: ITunesSearchResult): string {
    // Prefer higher resolution images
    return (
      result.artworkUrl600 ||
      result.artworkUrl100 ||
      result.artworkUrl60 ||
      result.artworkUrl30 ||
      ''
    );
  }

  /**
   * Validate if a URL is a valid iTunes podcast URL
   */
  static isITunesPodcastUrl(url: string): boolean {
    try {
      // Use regex instead of URL API for React Native compatibility
      const regex = /^https?:\/\/(podcasts\.apple\.com|itunes\.apple\.com).*\/podcast\//i;
      return regex.test(url);
    } catch {
      return false;
    }
  }

  /**
   * Extract podcast ID from iTunes URL
   * Example: https://podcasts.apple.com/us/podcast/podcast-name/id1234567890
   */
  static extractPodcastIdFromUrl(url: string): number | null {
    try {
      const match = url.match(/id(\d+)/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      return null;
    } catch {
      return null;
    }
  }
}

// Export a singleton instance
export const itunesSearchService = new ITunesSearchService();
