import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { RSSParserService } from '../services/rssParser';
import { itunesSearchService } from '../services/itunesSearch';
import { podcastIndexService, PodcastIndexService } from '../services/podcastIndexApi';
import { PodcastSearchResult, PodcastIndexFeed } from '../types';
import { useTheme } from '../contexts/ThemeContext';

// Genre definitions with categories
const GENRES = [
  { id: 'technology', name: 'Technology', category: 'Technology' },
  { id: 'business', name: 'Business', category: 'Business' },
  { id: 'finance', name: 'Finance', category: 'Investing' },
  { id: 'history', name: 'History', category: 'History' },
  { id: 'startups', name: 'Startups & VC', category: 'Entrepreneurship' },
  { id: 'software', name: 'Software Eng.', category: 'Technology' },
  { id: 'ai', name: 'AI', category: 'Technology' },
  { id: 'science', name: 'Science', category: 'Natural Sciences' },
  { id: 'biology', name: 'Biology', category: 'Life Sciences' },
];

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PodcastSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [feedUrl, setFeedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [trendingPodcasts, setTrendingPodcasts] = useState<PodcastIndexFeed[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trending' | 'search' | 'genres'>('trending');

  const addShow = useStore((state) => state.addShow);
  const addEpisodes = useStore((state) => state.addEpisodes);
  const { colors, isDark } = useTheme();

  // Load trending podcasts on mount
  useEffect(() => {
    loadTrendingPodcasts();
  }, []);

  const loadTrendingPodcasts = async () => {
    setLoadingTrending(true);
    try {
      const trending = await podcastIndexService.getTrendingPodcasts(20);
      setTrendingPodcasts(trending);
    } catch (error: any) {
      console.error('Failed to load trending podcasts:', error);
      // Don't show alert on initial load failure
    } finally {
      setLoadingTrending(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search term');
      return;
    }

    setSearching(true);
    setSearchResults([]);
    setActiveTab('search');

    try {
      // Try Podcast Index first for better results
      const feeds = await podcastIndexService.searchPodcasts(searchQuery.trim(), 20);
      const results = feeds.map(PodcastIndexService.feedToSearchResult);
      setSearchResults(results);

      if (results.length === 0) {
        Alert.alert('No Results', 'No podcasts found. Try a different search term.');
      }
    } catch (error: any) {
      console.error('Search failed:', error);
      Alert.alert('Search Error', error.message || 'Failed to search podcasts');
    } finally {
      setSearching(false);
    }
  };

  const handleGenreSelect = async (genreId: string) => {
    setSelectedGenre(genreId);
    setActiveTab('genres');
    setSearchResults([]);
    setSearching(true);

    try {
      const genre = GENRES.find(g => g.id === genreId);
      if (genre) {
        const feeds = await podcastIndexService.getTrendingPodcasts(20, genre.category);
        const results = feeds.map(PodcastIndexService.feedToSearchResult);
        setSearchResults(results);
      }
    } catch (error: any) {
      console.error('Failed to load genre podcasts:', error);
      Alert.alert('Error', error.message || 'Failed to load podcasts for this genre');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPodcast = async (podcast: PodcastSearchResult) => {
    setLoading(true);

    try {
      const parser = new RSSParserService();
      const result = await parser.fetchAndParseFeed(podcast.feedUrl);

      if (result) {
        // Add show and episodes to store
        addShow({
          ...result.show,
          etag: result.etag,
          lastModified: result.lastModified,
        });
        addEpisodes(result.episodes);

        Alert.alert('Success', `Added "${result.show.title}" to your library`);

        // Clear search results after successful add
        setSearchQuery('');
        setSearchResults([]);
      } else {
        Alert.alert('Error', 'Failed to fetch podcast feed');
      }
    } catch (error: any) {
      console.error('Failed to add podcast:', error);
      Alert.alert('Error', error.message || 'Failed to add podcast to library');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrendingPodcast = async (feed: PodcastIndexFeed) => {
    setLoading(true);

    try {
      const parser = new RSSParserService();
      const result = await parser.fetchAndParseFeed(feed.url);

      if (result) {
        addShow({
          ...result.show,
          etag: result.etag,
          lastModified: result.lastModified,
        });
        addEpisodes(result.episodes);

        Alert.alert('Success', `Added "${result.show.title}" to your library`);
      } else {
        Alert.alert('Error', 'Failed to fetch podcast feed');
      }
    } catch (error: any) {
      console.error('Failed to add podcast:', error);
      Alert.alert('Error', error.message || 'Failed to add podcast to library');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async () => {
    if (!feedUrl.trim()) {
      Alert.alert('Error', 'Please enter a feed URL');
      return;
    }

    setLoading(true);

    try {
      const parser = new RSSParserService();
      const result = await parser.fetchAndParseFeed(feedUrl.trim());

      if (result) {
        // Add show and episodes to store
        addShow({
          ...result.show,
          etag: result.etag,
          lastModified: result.lastModified,
        });
        addEpisodes(result.episodes);

        Alert.alert('Success', `Added "${result.show.title}" to your library`);
        setFeedUrl('');
      } else {
        Alert.alert('Info', 'No updates available for this feed');
      }
    } catch (error: any) {
      console.error('Failed to add feed:', error);
      Alert.alert('Error', error.message || 'Failed to add podcast feed');
    } finally {
      setLoading(false);
    }
  };

  const renderSearchResult = ({ item }: { item: PodcastSearchResult }) => (
    <TouchableOpacity
      style={{ flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }}
      onPress={() => handleSelectPodcast(item)}
      disabled={loading}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={{ width: 64, height: 64, borderRadius: 8 }}
        resizeMode="cover"
      />
      <View style={{ flex: 1, marginLeft: 16, justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
          {item.author}
        </Text>
        {item.genre && (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>{item.genre}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderTrendingPodcast = ({ item, index }: { item: PodcastIndexFeed; index: number }) => {
    const categoryNames = Object.values(item.categories || {}).join(', ');

    return (
      <TouchableOpacity
        style={{ flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card }}
        onPress={() => handleSelectTrendingPodcast(item)}
        disabled={loading}
      >
        <View style={{ width: 32, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.accent }}>#{index + 1}</Text>
        </View>
        <Image
          source={{ uri: item.artwork || item.image }}
          style={{ width: 64, height: 64, borderRadius: 8, marginLeft: 8 }}
          resizeMode="cover"
        />
        <View style={{ flex: 1, marginLeft: 16, justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
            {item.author || item.ownerName}
          </Text>
          {categoryNames && (
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }} numberOfLines={1}>
              {categoryNames}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderGenreChip = (genre: typeof GENRES[0]) => (
    <TouchableOpacity
      key={genre.id}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        marginBottom: 8,
        borderRadius: 20,
        backgroundColor: selectedGenre === genre.id && activeTab === 'genres' ? colors.accent : colors.surface,
      }}
      onPress={() => handleGenreSelect(genre.id)}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '600',
          color: selectedGenre === genre.id && activeTab === 'genres' ? '#FFFFFF' : colors.text,
        }}
      >
        {genre.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }}>
        <Text style={{ fontSize: 30, fontWeight: 'bold', padding: 20, color: colors.text }}>Discover Podcasts</Text>

        {/* Search Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.surface }}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search podcasts..."
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={{ paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: searching ? colors.textSecondary : colors.accent }}
              onPress={handleSearch}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Genre Categories */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: colors.text }}>Browse by Genre</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {GENRES.map(renderGenreChip)}
          </View>
        </View>

        {/* Content Area - shows trending, search results, or genre results */}
        {activeTab === 'trending' && (
          <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' }}>Top 20 Trending</Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Most popular podcasts right now</Text>
              </View>
              <TouchableOpacity onPress={loadTrendingPodcasts} disabled={loadingTrending}>
                <Text style={{ color: '#FFFFFF', fontSize: 24 }}>{loadingTrending ? '⟳' : '↻'}</Text>
              </TouchableOpacity>
            </View>
            {loadingTrending ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{ marginTop: 12, fontSize: 14, color: colors.textSecondary }}>Loading trending podcasts...</Text>
              </View>
            ) : trendingPodcasts.length > 0 ? (
              <FlatList
                data={trendingPodcasts}
                renderItem={renderTrendingPodcast}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false}
                ListFooterComponent={
                  loading ? (
                    <View style={{ padding: 16, alignItems: 'center' }}>
                      <ActivityIndicator size="large" color={colors.accent} />
                      <Text style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary }}>Adding podcast...</Text>
                    </View>
                  ) : null
                }
              />
            ) : (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  Unable to load trending podcasts.{'\n'}Please check your API credentials.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Search Results */}
        {activeTab === 'search' && searchResults.length > 0 && (
          <View style={{ flex: 1, marginBottom: 16 }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.accent }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                Search Results ({searchResults.length})
              </Text>
            </View>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListFooterComponent={
                loading ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary }}>Adding podcast...</Text>
                  </View>
                ) : null
              }
            />
          </View>
        )}

        {/* Genre Results */}
        {activeTab === 'genres' && searchResults.length > 0 && (
          <View style={{ flex: 1, marginBottom: 16 }}>
            <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.accent }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' }}>
                {GENRES.find(g => g.id === selectedGenre)?.name} Podcasts ({searchResults.length})
              </Text>
            </View>
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListFooterComponent={
                loading ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={colors.accent} />
                    <Text style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary }}>Adding podcast...</Text>
                  </View>
                ) : null
              }
            />
          </View>
        )}

        {/* Manual Entry Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 16 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border }}
            onPress={() => setShowManualEntry(!showManualEntry)}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
              Advanced: Add by RSS Feed URL
            </Text>
            <Text style={{ fontSize: 20, color: colors.textSecondary }}>
              {showManualEntry ? '▼' : '▶'}
            </Text>
          </TouchableOpacity>

          {showManualEntry && (
            <View style={{ marginTop: 8 }}>
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, color: colors.text, backgroundColor: colors.surface }}
                value={feedUrl}
                onChangeText={setFeedUrl}
                placeholder="https://example.com/feed.xml"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <TouchableOpacity
                style={{ padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 16, backgroundColor: loading ? colors.textSecondary : colors.accent }}
                onPress={handleAddFeed}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Add to Library</Text>
                )}
              </TouchableOpacity>

              <Text style={{ fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginBottom: 16 }}>
                For podcasts not available through search or trending lists
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

