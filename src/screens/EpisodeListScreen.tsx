import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { LibraryStackParamList } from '../navigation/AppNavigator';
import { useStore } from '../store';
import { AudioPlayerService } from '../services/audioPlayer';
import { DownloadService } from '../services/downloadService';
import { formatDuration } from '../utils/formatters';
import { voiceClient } from '../voice/LiveKitVoiceClient';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 320;
const HEADER_MIN_HEIGHT = 60;

type EpisodeListRouteProp = RouteProp<LibraryStackParamList, 'EpisodeList'>;

export default function EpisodeListScreen() {
  const route = useRoute<EpisodeListRouteProp>();
  const { showId } = route.params;

  const show = useStore((state) => state.getShow(showId));
  const allEpisodes = useStore((state) => state.episodes);
  const downloads = useStore((state) => state.downloads);
  const setPlayback = useStore((state) => state.setPlayback);
  const { colors } = useTheme();

  // Scroll animation value
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Memoize episodes filtering to avoid infinite loops
  const episodes = React.useMemo(() => {
    return Object.values(allEpisodes)
      .filter((ep) => ep.showId === showId)
      .sort((a, b) => b.publishDate - a.publishDate);
  }, [allEpisodes, showId]);

  // Animated header styles
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(
      scrollY.value,
      [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
      [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
      Extrapolation.CLAMP
    );

    return {
      height,
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
      [1, 0],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT) / 2],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const titleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, (HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT) / 2],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  const collapsedTitleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [(HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT) / 2, HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT],
      [0, 1],
      Extrapolation.CLAMP
    );

    return {
      opacity,
    };
  });

  const handlePlayEpisode = async (episodeId: string) => {
    const episode = episodes.find((ep) => ep.id === episodeId);
    if (!episode) return;

    const download = downloads[episodeId];
    const localUri = download?.status === 'completed' ? download.localUri : undefined;

    try {
      await AudioPlayerService.loadEpisode(episode, show?.author, localUri);
      await AudioPlayerService.play();

      setPlayback({
        episodeId: episode.id,
        position: 0,
        duration: episode.duration * 1000,
        isPlaying: true,
      });

      // Voice assistant will only connect when user explicitly activates it
      // (removed auto-connect to save resources and prevent unwanted microphone access)
    } catch (error) {
      console.error('Failed to play episode:', error);
    }
  };

  const renderEpisode = ({ item }: { item: any }) => {
    const download = downloads[item.id];
    const isDownloaded = download?.status === 'completed';

    return (
      <TouchableOpacity
        style={[styles.episodeCard, { backgroundColor: colors.surface }]}
        onPress={() => handlePlayEpisode(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.episodeContent}>
          {/* Artwork */}
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.episodeImage} />
          ) : (
            <View style={[styles.episodeImage, styles.episodeImagePlaceholder, { backgroundColor: colors.card }]}>
              <Ionicons name="musical-note" size={24} color={colors.textSecondary} />
            </View>
          )}

          {/* Episode Info */}
          <View style={styles.episodeInfo}>
            <Text style={[styles.episodeTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.episodeMetaRow}>
              <Text style={[styles.episodeDate, { color: colors.textSecondary }]}>
                {new Date(item.publishDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
              <Text style={[styles.episodeSeparator, { color: colors.textSecondary }]}>•</Text>
              <Text style={[styles.episodeDuration, { color: colors.textSecondary }]}>
                {formatDuration(item.duration)}
              </Text>
              {isDownloaded && (
                <>
                  <Text style={[styles.episodeSeparator, { color: colors.textSecondary }]}>•</Text>
                  <View style={styles.downloadedBadge}>
                    <Ionicons name="download" size={10} color={colors.accent} />
                    <Text style={[styles.downloadedText, { color: colors.accent }]}>Downloaded</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Play Icon */}
          <View style={styles.playIconContainer}>
            <Ionicons name="play-circle" size={32} color={colors.text} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Animated Header */}
      {show && (
        <Animated.View style={[styles.headerSection, headerAnimatedStyle, { backgroundColor: colors.surface }]}>
          <View style={[styles.headerBackground, { backgroundColor: colors.surface }]} />

          {/* Large header content (visible when not scrolled) */}
          <Animated.View style={[styles.headerContent, titleAnimatedStyle]}>
            {show.imageUrl && (
              <Animated.Image
                source={{ uri: show.imageUrl }}
                style={[styles.showImage, imageAnimatedStyle]}
              />
            )}
            <Text style={[styles.showTitle, { color: colors.text }]}>{show.title}</Text>
            {show.author && (
              <Text style={[styles.showAuthor, { color: colors.textSecondary }]}>{show.author}</Text>
            )}
            <Text style={[styles.episodeCount, { color: colors.textSecondary }]}>
              {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
            </Text>
          </Animated.View>

          {/* Collapsed header bar (visible when scrolled) */}
          <Animated.View style={[styles.collapsedHeader, collapsedTitleStyle]}>
            <Text style={[styles.collapsedTitle, { color: colors.text }]} numberOfLines={1}>
              {show.title}
            </Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* Episodes List */}
      <Animated.FlatList
        data={episodes}
        renderItem={renderEpisode}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  showImage: {
    width: 180,
    height: 180,
    borderRadius: 8,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  showTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  showAuthor: {
    fontSize: 14,
    color: '#B3B3B3',
    textAlign: 'center',
    marginBottom: 8,
  },
  episodeCount: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    fontWeight: '500',
  },
  collapsedHeader: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HEADER_MIN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  collapsedTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContent: {
    paddingTop: HEADER_MAX_HEIGHT + 16,
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  episodeCard: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  episodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  episodeImage: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  episodeImagePlaceholder: {
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 20,
  },
  episodeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  episodeDate: {
    fontSize: 12,
    color: '#B3B3B3',
  },
  episodeSeparator: {
    fontSize: 12,
    color: '#666666',
    marginHorizontal: 6,
  },
  episodeDuration: {
    fontSize: 12,
    color: '#B3B3B3',
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  downloadedText: {
    fontSize: 11,
    color: '#1DB954',
    fontWeight: '600',
  },
  playIconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
});

