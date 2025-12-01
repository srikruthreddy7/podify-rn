import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, ScrollView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useStore } from '../store';
import { AudioPlayerService } from '../services/audioPlayer';
import { voiceClient } from '../voice/LiveKitVoiceClient';
import { formatTime } from '../utils/formatters';
import Slider from '@react-native-community/slider';
import { usePlaybackSync } from '../hooks/usePlaybackSync';

const { width, height } = Dimensions.get('window');

interface NowPlayingScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function NowPlayingScreen({ visible, onClose }: NowPlayingScreenProps) {
  const insets = useSafeAreaInsets();
  const playback = useStore((state) => state.playback);
  const episode = useStore((state) =>
    state.getEpisode(state.playback.episodeId || '')
  );
  const transcript = useStore((state) =>
    state.getTranscript(state.playback.episodeId || '')
  );
  const setPlayback = useStore((state) => state.setPlayback);
  const setPosition = useStore((state) => state.setPosition);

  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceResponse, setVoiceResponse] = useState('');
  const [isSeeking, setIsSeeking] = useState(false);

  // Playback sync hook - syncs progress to Supabase
  usePlaybackSync();

  // Reanimated shared values for smooth animations
  const translateY = useSharedValue(height);
  const context = useSharedValue({ y: 0 });

  const handleClose = () => {
    console.log('handleClose called');
    translateY.value = withTiming(height, { duration: 250 }, () => {
      runOnJS(onClose)();
    });
  };

  // Pan gesture for swipe down to dismiss
  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      // Only allow downward drags
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      // Close if dragged down more than 150px or velocity is high
      if (event.translationY > 150 || event.velocityY > 800) {
        translateY.value = withTiming(height, { duration: 250 }, () => {
          runOnJS(onClose)();
        });
      } else {
        // Smoothly return to original position
        translateY.value = withTiming(0, {
          duration: 200,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  useEffect(() => {
    if (visible) {
      console.log('Modal opening');
      translateY.value = withTiming(0, {
        duration: 300,
      });
    } else {
      console.log('Modal closing');
      translateY.value = height;
    }
  }, [visible]);

  useEffect(() => {
    // Update position periodically
    const interval = setInterval(async () => {
      if (playback.isPlaying) {
        const position = await AudioPlayerService.getPosition();
        setPosition(position);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playback.isPlaying]);

  // Cleanup voice assistant when modal closes or component unmounts
  useEffect(() => {
    return () => {
      // Cleanup function runs when component unmounts or modal closes
      if (isVoiceActive) {
        console.log('🧹 Cleaning up voice assistant on modal close...');
        voiceClient.stopListening().catch(console.error);
        voiceClient.disconnect().catch(console.error);
      }
    };
  }, [isVoiceActive]);

  // Also cleanup when modal becomes not visible
  useEffect(() => {
    if (!visible && isVoiceActive) {
      console.log('🧹 Modal closed - cleaning up voice assistant...');
      const cleanup = async () => {
        try {
          await voiceClient.stopListening();
          await voiceClient.disconnect();
          setIsVoiceActive(false);
          setVoiceResponse('');
          console.log('✅ Voice assistant cleaned up');
        } catch (error) {
          console.error('Error cleaning up voice assistant:', error);
        }
      };
      cleanup();
    }
  }, [visible, isVoiceActive]);

  const togglePlayPause = async () => {
    await AudioPlayerService.togglePlayPause();
    setPlayback({ isPlaying: !playback.isPlaying });
  };

  const handleSeekBackward = async () => {
    await AudioPlayerService.jumpBackward();
  };

  const handleSeekForward = async () => {
    await AudioPlayerService.jumpForward();
  };

  const handleSliderChange = async (value: number) => {
    if (!isSeeking) return;
    setPosition(value);
  };

  const handleSlidingStart = () => {
    setIsSeeking(true);
  };

  const handleSlidingComplete = async (value: number) => {
    await AudioPlayerService.seekTo(value);
    setPosition(value);
    setIsSeeking(false);
  };

  const changeSpeed = async () => {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const currentIndex = speeds.indexOf(playback.rate);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newRate = speeds[nextIndex];

    await AudioPlayerService.setRate(newRate);
    setPlayback({ rate: newRate });
  };

  const toggleVoiceAssistant = async () => {
    if (isVoiceActive) {
      console.log('🔇 Deactivating voice assistant...');
      try {
        // Stop listening first
        await voiceClient.stopListening();

        // Fully disconnect and clean up the room
        await voiceClient.disconnect();

        setIsVoiceActive(false);
        setVoiceResponse('');
        console.log('✅ Voice assistant deactivated and cleaned up');
      } catch (error) {
        console.error('Error deactivating voice assistant:', error);
        setIsVoiceActive(false);
      }
    } else {
      try {
        console.log('🎤 Activating voice assistant...');

        // Pause the podcast when activating voice assistant
        if (playback.isPlaying) {
          await AudioPlayerService.pause();
          setPlayback({ isPlaying: false });
        }

        // Prepare podcast context to send to the voice agent
        const podcastContext = episode && show ? {
          podcastRssUrl: show.feedUrl,
          episodeUrl: episode.audioUrl,
          currentTimestamp: playback.position // in milliseconds
        } : undefined;

        // Connect to LiveKit room with podcast context
        // Generate unique room name for each session to ensure agent dispatch
        const sessionId = Date.now();
        const roomName = `podcast-voice-room-${sessionId}`;
        await voiceClient.connect(roomName, 'user', podcastContext);
        console.log('✅ Connected to LiveKit room');

        // Set up response callback
        voiceClient.onResponse((text) => {
          setVoiceResponse(text);
          setTimeout(() => setVoiceResponse(''), 3000);
        });

        // Set up disconnect callback to update UI when connection drops
        voiceClient.onDisconnect(() => {
          console.log('⚠️  Voice connection lost - updating UI state');
          setIsVoiceActive(false);
          setVoiceResponse('Connection lost. Please try again.');
          setTimeout(() => setVoiceResponse(''), 3000);
        });

        // Start listening
        await voiceClient.startListening();
        setIsVoiceActive(true);
        console.log('✅ Voice assistant activated');
      } catch (error) {
        console.error('Failed to start voice assistant:', error);
        setIsVoiceActive(false);
        // Try to clean up on error
        try {
          await voiceClient.disconnect();
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError);
        }
      }
    }
  };

  // IMPORTANT: All hooks must be called before any early returns
  const show = useStore((state) =>
    episode ? state.getShow(episode.showId) : null
  );

  const getCurrentTranscriptText = () => {
    if (!transcript) return null;

    const currentSegment = transcript.segments.find(
      (seg) => seg.startTime <= playback.position && seg.endTime >= playback.position
    );

    return currentSegment?.text;
  };

  const currentText = getCurrentTranscriptText();

  if (!episode) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <GestureHandlerRootView style={styles.modalBackground}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.modalContainer, animatedStyle]}>
            <SafeAreaView style={styles.container} edges={['bottom']}>
              <View style={styles.backgroundContainer}>
                {/* Top spacing for notch/dynamic island */}
                <View style={[styles.topSpacer, { height: insets.top || 20 }]} />

                {/* Header with dismiss button - NOW BELOW THE NOTCH */}
                <View style={styles.header}>
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Close button pressed');
                      handleClose();
                    }}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.dragHandleContainer}>
                    <View style={styles.dragHandle} />
                  </View>
                </View>

                <ScrollView
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                  bounces={true}
                  scrollEventThrottle={16}
                >
              {/* Album Art with Glass Effect */}
              <View style={styles.artworkContainer}>
            {episode.imageUrl ? (
              <Image
                source={{ uri: episode.imageUrl }}
                style={styles.artwork}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.artwork, styles.artworkPlaceholder]} />
            )}
          </View>

          {/* Episode Info */}
          <View style={styles.infoSection}>
            <Text style={styles.episodeTitle} numberOfLines={2}>
              {episode.title}
            </Text>
            <Text style={styles.showTitle} numberOfLines={1}>
              {show?.title || 'Unknown Show'}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <Slider
              style={styles.slider}
              value={isSeeking ? playback.position : playback.position}
              minimumValue={0}
              maximumValue={playback.duration}
              onValueChange={handleSliderChange}
              onSlidingStart={handleSlidingStart}
              onSlidingComplete={handleSlidingComplete}
              minimumTrackTintColor="#1DB954"
              maximumTrackTintColor="#4d4d4d"
              thumbTintColor="#FFFFFF"
            />
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(playback.position)}</Text>
              <Text style={styles.timeText}>{formatTime(playback.duration)}</Text>
            </View>
          </View>

          {/* Playback Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleSeekBackward}
            >
              <Ionicons name="play-back" size={36} color="#FFFFFF" />
              <Text style={styles.controlLabel}>15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayPause}
            >
              <Ionicons
                name={playback.isPlaying ? 'pause' : 'play'}
                size={44}
                color="#000000"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleSeekForward}
            >
              <Ionicons name="play-forward" size={36} color="#FFFFFF" />
              <Text style={styles.controlLabel}>15s</Text>
            </TouchableOpacity>
          </View>

          {/* Speed Control */}
          <View style={styles.speedContainer}>
            <TouchableOpacity style={styles.speedButton} onPress={changeSpeed}>
              <Ionicons name="speedometer-outline" size={20} color="#1DB954" />
              <Text style={styles.speedText}>{playback.rate}x</Text>
              <Text style={styles.speedLabel}>Speed</Text>
            </TouchableOpacity>
          </View>

          {/* Voice Assistant */}
          <View style={styles.voiceContainer}>
            <TouchableOpacity
              style={[styles.voiceButton, isVoiceActive && styles.voiceButtonActive]}
              onPress={toggleVoiceAssistant}
            >
              <Ionicons
                name={isVoiceActive ? 'mic' : 'mic-outline'}
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.voiceButtonText}>
                {isVoiceActive ? 'Listening...' : 'Voice Assistant'}
              </Text>
            </TouchableOpacity>
          </View>

          {voiceResponse && (
            <View style={styles.voiceResponseContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#1DB954" />
              <Text style={styles.voiceResponseText}>{voiceResponse}</Text>
            </View>
          )}

          {/* Current Transcript */}
          {currentText && (
            <View style={styles.transcriptContainer}>
              <View style={styles.transcriptHeader}>
                <Ionicons name="document-text-outline" size={16} color="#B3B3B3" />
                <Text style={styles.transcriptLabel}>Current Transcript</Text>
              </View>
              <Text style={styles.transcriptText}>{currentText}</Text>
            </View>
          )}

          {/* Full Transcript */}
          {transcript && (
            <View style={styles.fullTranscriptContainer}>
              <View style={styles.transcriptHeader}>
                <Ionicons name="list-outline" size={16} color="#B3B3B3" />
                <Text style={styles.transcriptLabel}>Full Transcript</Text>
              </View>
              {transcript.segments.map((seg, idx) => (
                <View
                  key={idx}
                  style={styles.transcriptSegment}
                >
                  <TouchableOpacity
                    style={styles.transcriptSegmentContent}
                    onPress={() => handleSliderChange(seg.startTime)}
                  >
                    <View style={styles.transcriptTimeContainer}>
                      <Ionicons name="time-outline" size={12} color="#1DB954" />
                      <Text style={styles.transcriptTime}>
                        {formatTime(seg.startTime)}
                      </Text>
                    </View>
                    <Text style={styles.transcriptSegmentText}>{seg.text}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topSpacer: {
    width: '100%',
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dragHandleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 8,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  scrollView: {
    flex: 1,
  },
  artworkContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  artwork: {
    width: width - 48,
    height: width - 48,
    borderRadius: 8,
  },
  artworkPlaceholder: {
    backgroundColor: '#282828',
  },
  infoSection: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  episodeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  showTitle: {
    fontSize: 16,
    color: '#B3B3B3',
  },
  progressSection: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  timeText: {
    fontSize: 12,
    color: '#B3B3B3',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 11,
    color: '#B3B3B3',
    marginTop: 4,
    fontWeight: '500',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  speedContainer: {
    marginHorizontal: 24,
    marginVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  speedButton: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  speedText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1DB954',
  },
  speedLabel: {
    fontSize: 13,
    color: '#B3B3B3',
    fontWeight: '500',
  },
  voiceContainer: {
    marginHorizontal: 24,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  voiceButton: {
    padding: 20,
    backgroundColor: '#1DB954',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  voiceButtonActive: {
    backgroundColor: '#EF4444',
  },
  voiceButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  voiceResponseContainer: {
    marginHorizontal: 24,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(29, 185, 84, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#1DB954',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  voiceResponseText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  transcriptContainer: {
    marginHorizontal: 24,
    marginVertical: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  transcriptLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B3B3B3',
  },
  transcriptText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 22,
  },
  fullTranscriptContainer: {
    marginHorizontal: 24,
    marginBottom: 100,
  },
  transcriptSegment: {
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  transcriptSegmentContent: {
    padding: 14,
  },
  transcriptTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  transcriptTime: {
    fontSize: 12,
    color: '#1DB954',
    fontWeight: '600',
  },
  transcriptSegmentText: {
    fontSize: 14,
    color: '#E0E0E0',
    lineHeight: 20,
  },
});

