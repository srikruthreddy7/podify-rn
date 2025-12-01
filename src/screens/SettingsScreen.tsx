import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DownloadService } from '../services/downloadService';
import { useStore } from '../store';
import { config } from '../utils/config';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { syncService } from '../services/syncService';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const clearAllDownloads = async () => {
    Alert.alert(
      'Clear All Downloads',
      'Are you sure you want to delete all downloaded episodes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DownloadService.clearAllDownloads();
              // Also clear download states from store
              const downloads = useStore.getState().downloads;
              Object.keys(downloads).forEach((episodeId) => {
                useStore.getState().removeDownload(episodeId);
              });
              Alert.alert('Success', 'All downloads cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear downloads');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            // Flush any pending playback progress before signing out
            await syncService.flushPlaybackProgress();
            await signOut();
            setIsSigningOut(false);
          },
        },
      ]
    );
  };

  const clearListeningHistory = async () => {
    if (!user) return;
    
    Alert.alert(
      'Clear Listening History',
      'Are you sure you want to clear all your listening history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await syncService.clearListeningHistory(user.id);
              Alert.alert('Success', 'Listening history cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear listening history');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 30, fontWeight: 'bold', padding: 20, color: colors.text }}>Settings</Text>

      {/* Account Section */}
      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', paddingHorizontal: 20, paddingBottom: 12, color: colors.textSecondary }}>Account</Text>
        <View style={{ padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {profile?.avatar_url ? (
              <Image 
                source={{ uri: profile.avatar_url }} 
                style={{ width: 56, height: 56, borderRadius: 28, marginRight: 16 }}
              />
            ) : (
              <View style={{ 
                width: 56, 
                height: 56, 
                borderRadius: 28, 
                backgroundColor: colors.accent,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}>
                <Text style={{ fontSize: 24, color: '#fff', fontWeight: '600' }}>
                  {(profile?.display_name || user?.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>
                {profile?.display_name || 'User'}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 2 }}>
                {user?.email || ''}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={{ 
            flexDirection: 'row', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: 16, 
            paddingHorizontal: 20, 
            backgroundColor: colors.surface, 
            borderBottomWidth: 1, 
            borderBottomColor: colors.border 
          }}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={{ fontSize: 16, color: '#FF6B6B', fontWeight: '600' }}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', paddingHorizontal: 20, paddingBottom: 12, color: colors.textSecondary }}>Appearance</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>Dark Mode</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
              {isDark ? 'Dark theme enabled' : 'Light theme enabled'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: colors.accent }}
            thumbColor={isDark ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', paddingHorizontal: 20, paddingBottom: 12, color: colors.textSecondary }}>Storage</Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}
          onPress={clearAllDownloads}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>Clear All Downloads</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
              Remove all downloaded episodes
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}
          onPress={clearListeningHistory}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>Clear Listening History</Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 4 }}>
              Remove your listening history from the cloud
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', paddingHorizontal: 20, paddingBottom: 12, color: colors.textSecondary }}>Playback</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 16, flex: 1, color: colors.text }}>Skip Forward Interval</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, maxWidth: '50%' }}>15 seconds</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 16, flex: 1, color: colors.text }}>Skip Backward Interval</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, maxWidth: '50%' }}>15 seconds</Text>
        </View>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', paddingHorizontal: 20, paddingBottom: 12, color: colors.textSecondary }}>Voice Assistant</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 16, flex: 1, color: colors.text }}>LiveKit URL</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, maxWidth: '50%' }} numberOfLines={1}>
            {config.livekit.url}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 16, flex: 1, color: colors.text }}>Command Timeout</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, maxWidth: '50%' }}>500ms</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 16, flex: 1, color: colors.text }}>Q&A Timeout</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, maxWidth: '50%' }}>3000ms</Text>
        </View>
      </View>

      <View style={{ marginBottom: 32 }}>
        <Text style={{ fontSize: 20, fontWeight: '600', paddingHorizontal: 20, paddingBottom: 12, color: colors.textSecondary }}>About</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 16, flex: 1, color: colors.text }}>App Version</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, maxWidth: '50%' }}>1.0.0</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingHorizontal: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <Text style={{ fontSize: 16, flex: 1, color: colors.text }}>Platform</Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, maxWidth: '50%' }}>React Native + Expo</Text>
        </View>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

