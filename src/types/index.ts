// Core domain types for Podify

export interface PodcastShow {
  id: string;
  title: string;
  description: string;
  author: string;
  imageUrl: string;
  feedUrl: string;
  websiteUrl?: string;
  lastUpdated: number;
  etag?: string;
  lastModified?: string;
}

export interface Episode {
  id: string;
  showId: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: number; // seconds
  publishDate: number; // timestamp
  imageUrl?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  chapters?: Chapter[];
  transcriptUrl?: string;
  transcriptType?: 'application/srt' | 'application/json' | 'text/vtt';
}

export interface Chapter {
  startTime: number; // milliseconds
  endTime?: number;
  title: string;
  url?: string;
  imageUrl?: string;
}

export interface Transcript {
  episodeId: string;
  segments: TranscriptSegment[];
  type: 'srt' | 'json' | 'vtt';
  lastUpdated: number;
}

export interface TranscriptSegment {
  startTime: number; // milliseconds
  endTime: number; // milliseconds
  text: string;
  speaker?: string;
}

export interface DownloadState {
  episodeId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number; // 0-1
  localUri?: string;
  error?: string;
}

export interface Bookmark {
  id: string;
  episodeId: string;
  timestamp: number; // milliseconds into episode
  note?: string;
  createdAt: number;
}

export interface PlaybackState {
  episodeId: string | null;
  position: number; // milliseconds
  duration: number; // milliseconds
  isPlaying: boolean;
  rate: number; // 0.5, 1.0, 1.5, 2.0, etc.
  buffering: boolean;
}

export interface VoiceIntent {
  type: IntentType;
  parameters?: Record<string, any>;
  utterance: string;
  confidence: number;
}

export type IntentType =
  | 'pause'
  | 'resume'
  | 'seek_backward'
  | 'seek_forward'
  | 'set_speed'
  | 'next_chapter'
  | 'previous_chapter'
  | 'bookmark'
  | 'show_bookmarks'
  | 'rewind_and_play'
  | 'summarize'
  | 'explain'
  | 'question'
  | 'jump_to'
  | 'unknown';

export interface VoiceCommand {
  intent: VoiceIntent;
  timestamp: number;
  executed: boolean;
  result?: any;
  error?: string;
}

export interface QAContext {
  episodeId: string;
  playheadMs: number;
  transcriptWindow: TranscriptSegment[];
  query: string;
}

export interface QAResponse {
  answer: string;
  confidence: number;
  sources: {
    segment: TranscriptSegment;
    relevance: number;
  }[];
  suggestedSeek?: number; // milliseconds
}

// iTunes Search API types
export interface ITunesSearchResult {
  wrapperType: string;
  kind: string;
  collectionId: number;
  trackId: number;
  artistName: string;
  collectionName: string;
  trackName: string;
  collectionCensoredName: string;
  trackCensoredName: string;
  collectionViewUrl: string;
  feedUrl: string;
  trackViewUrl: string;
  artworkUrl30?: string;
  artworkUrl60?: string;
  artworkUrl100?: string;
  artworkUrl600?: string;
  collectionPrice?: number;
  trackPrice?: number;
  releaseDate: string;
  collectionExplicitness: string;
  trackExplicitness: string;
  trackCount: number;
  country: string;
  primaryGenreName: string;
  contentAdvisoryRating?: string;
  genreIds?: string[];
  genres?: string[];
}

export interface ITunesSearchResponse {
  resultCount: number;
  results: ITunesSearchResult[];
}

export interface PodcastSearchResult {
  id: string;
  title: string;
  author: string;
  description: string;
  imageUrl: string;
  feedUrl: string;
  websiteUrl?: string;
  genre?: string;
  trackCount?: number;
}

// Podcast Index API types
export interface PodcastIndexFeed {
  id: number;
  title: string;
  url: string;
  originalUrl: string;
  link: string;
  description: string;
  author: string;
  ownerName: string;
  image: string;
  artwork: string;
  lastUpdateTime: number;
  lastCrawlTime: number;
  lastParseTime: number;
  lastGoodHttpStatusTime: number;
  lastHttpStatus: number;
  contentType: string;
  itunesId?: number;
  language: string;
  explicit: boolean;
  type: number;
  medium: string;
  dead: number;
  episodeCount: number;
  crawlErrors: number;
  parseErrors: number;
  categories: Record<string, string>;
  locked: number;
  imageUrlHash: number;
  newestItemPublishTime?: number;
  trendScore?: number;
}

export interface PodcastIndexTrendingResponse {
  status: string;
  feeds: PodcastIndexFeed[];
  count: number;
  max: number;
  since?: number;
  description: string;
}

export interface PodcastIndexCategory {
  id: number;
  name: string;
}

export interface PodcastIndexCategoriesResponse {
  status: string;
  feeds: PodcastIndexCategory[];
  count: number;
  description: string;
}
