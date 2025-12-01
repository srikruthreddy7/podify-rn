import { XMLParser } from 'fast-xml-parser';
import { PodcastShow, Episode, Chapter } from '../types';

export class RSSParserService {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
  }

  async fetchAndParseFeed(feedUrl: string, etag?: string, lastModified?: string): Promise<{
    show: PodcastShow;
    episodes: Episode[];
    etag?: string;
    lastModified?: string;
  } | null> {
    try {
      const headers: HeadersInit = {};
      if (etag) headers['If-None-Match'] = etag;
      if (lastModified) headers['If-Modified-Since'] = lastModified;

      const response = await fetch(feedUrl, { headers });

      // 304 Not Modified - no updates
      if (response.status === 304) {
        return null;
      }

      const xmlText = await response.text();
      const parsed = this.parser.parse(xmlText);

      // Support both RSS and Atom feeds
      const channel = parsed.rss?.channel || parsed.feed || parsed.channel;
      if (!channel) {
        console.error('Parsed feed structure:', JSON.stringify(parsed, null, 2));
        throw new Error('Invalid podcast feed format');
      }

      const show = this.parseShow(feedUrl, channel);
      const episodes = this.parseEpisodes(show.id, channel);

      return {
        show,
        episodes,
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
      };
    } catch (error) {
      console.error('Failed to fetch/parse RSS feed:', error);
      throw error;
    }
  }

  private parseShow(feedUrl: string, channel: any): PodcastShow {
    const showId = this.generateId(feedUrl);

    return {
      id: showId,
      title: channel.title || 'Unknown Podcast',
      description: channel.description || '',
      author: channel['itunes:author'] || channel.author || 'Unknown',
      imageUrl: this.extractImage(channel),
      feedUrl,
      websiteUrl: channel.link,
      lastUpdated: Date.now(),
    };
  }

  private parseEpisodes(showId: string, channel: any): Episode[] {
    // Support both RSS (item) and Atom (entry) formats
    const items = channel.item || channel.entry || [];
    const itemsArray = Array.isArray(items) ? items : [items].filter(Boolean);

    return itemsArray.map((item: any) => this.parseEpisode(showId, item));
  }

  private parseEpisode(showId: string, item: any): Episode {
    // Support both RSS enclosure and Atom link formats
    const enclosure = item.enclosure;
    let audioUrl = enclosure?.['@_url'] || '';

    // For Atom feeds, check link tags
    if (!audioUrl && item.link) {
      const links = Array.isArray(item.link) ? item.link : [item.link];
      const audioLink = links.find((l: any) =>
        l['@_type']?.includes('audio') || l['@_rel'] === 'enclosure'
      );
      audioUrl = audioLink?.['@_href'] || '';
    }

    // Parse duration (can be in various formats)
    const durationStr = item['itunes:duration'] || '0';
    const duration = this.parseDuration(durationStr);

    // Extract transcript URL from Podcasting 2.0 namespace
    const transcriptTag = item['podcast:transcript'];
    const transcriptUrl = transcriptTag?.['@_url'];
    const transcriptType = transcriptTag?.['@_type'] as any;

    // Parse chapters if available
    const chaptersTag = item['podcast:chapters'];
    const chaptersUrl = chaptersTag?.['@_url'];

    // Get title and description (support both RSS and Atom)
    const title = item.title?.['#text'] || item.title || 'Untitled Episode';
    const description = item.description || item['content:encoded'] || item.summary || item.content?.['#text'] || item.content || '';

    // Get publish date (support both pubDate and published)
    const dateStr = item.pubDate || item.published || item.updated;
    const publishDate = dateStr ? new Date(dateStr).getTime() : Date.now();

    const episodeId = this.generateId(audioUrl || item.guid || item.id || title);

    return {
      id: episodeId,
      showId,
      title,
      description,
      audioUrl,
      duration,
      publishDate,
      imageUrl: this.extractImage(item),
      episodeNumber: parseInt(item['itunes:episode']) || undefined,
      seasonNumber: parseInt(item['itunes:season']) || undefined,
      transcriptUrl,
      transcriptType,
      // Chapters would need to be fetched separately if chaptersUrl is provided
    };
  }

  private extractImage(item: any): string {
    // Try various image formats
    const itunesImage = item['itunes:image']?.['@_href'];
    const imageTag = item.image?.url || item.image;
    const mediaContent = item['media:content']?.find((m: any) => m['@_medium'] === 'image')?.['@_url'];

    return itunesImage || imageTag || mediaContent || '';
  }

  private parseDuration(duration: string | number): number {
    if (typeof duration === 'number') return duration;

    const parts = duration.split(':').map(Number);
    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else {
      // Seconds only
      return parseInt(duration) || 0;
    }
  }

  private generateId(input: string): string {
    // Simple hash function for generating IDs
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
