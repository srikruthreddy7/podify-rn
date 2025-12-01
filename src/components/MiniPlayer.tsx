import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { AudioPlayerService } from '../services/audioPlayer';
import { useTheme } from '../contexts/ThemeContext';

interface MiniPlayerProps {
  onPress?: () => void;
}

export default function MiniPlayer({ onPress }: MiniPlayerProps) {
  const playback = useStore((state) => state.playback);
  const getEpisode = useStore((state) => state.getEpisode);
  const getShow = useStore((state) => state.getShow);
  const setPlayback = useStore((state) => state.setPlayback);
  const { colors } = useTheme();

  // Don't render if no episode is loaded
  if (!playback.episodeId) {
    return null;
  }

  const episode = getEpisode(playback.episodeId);
  const show = episode ? getShow(episode.showId) : null;

  if (!episode) {
    return null;
  }

  const handlePlayPause = async (e: any) => {
    e.stopPropagation();
    try {
      await AudioPlayerService.togglePlayPause();
      setPlayback({ isPlaying: !playback.isPlaying });
    } catch (error) {
      console.error('Failed to toggle playback:', error);
    }
  };

  // Calculate progress percentage
  const progressPercentage = playback.duration > 0
    ? (playback.position / playback.duration) * 100
    : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      style={styles.container}
    >
      <View style={[styles.backgroundContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {/* Progress Bar */}
        <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%`, backgroundColor: colors.accent }]} />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Artwork */}
          {episode.imageUrl ? (
            <Image
              source={{ uri: episode.imageUrl }}
              style={styles.artwork}
            />
          ) : (
            <View style={[styles.artwork, styles.artworkPlaceholder, { backgroundColor: colors.card }]} />
          )}

          {/* Episode Info */}
          <View style={styles.infoContainer}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {episode.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {show?.title || 'Unknown Show'}
            </Text>
          </View>

          {/* Play/Pause Button */}
          <TouchableOpacity
            onPress={handlePlayPause}
            style={styles.playButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={playback.isPlaying ? 'pause' : 'play'}
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
  },
  backgroundContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1DB954', // Spotify green
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
  },
  artworkPlaceholder: {
    backgroundColor: '#282828',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: '#B3B3B3',
    fontSize: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 22,
  },
});
