import Constants from 'expo-constants';

// Environment configuration with fallbacks
export const config = {
  livekit: {
    url: Constants.expoConfig?.extra?.EXPO_PUBLIC_LIVEKIT_WS_URL ||
         Constants.expoConfig?.extra?.LIVEKIT_URL ||
         'wss://your-livekit-server.com',
  },
  server: {
    url: Constants.expoConfig?.extra?.SERVER_URL || 'http://localhost:3000',
  },
  // Podcast Index API is now accessed via Supabase Edge Function
  // No client-side API keys needed - all authentication happens server-side
  audio: {
    seekInterval: 15000, // 15 seconds in milliseconds
    transcriptContextWindow: 120000, // ±120 seconds around playhead
  },
  voice: {
    commandTimeout: 500, // ms - max latency for local commands
    qaTimeout: 3000, // ms - max latency for Q&A responses
  },
};

// Log configuration on startup for debugging
console.log('=== App Configuration ===');
console.log('LiveKit URL:', config.livekit.url);
console.log('Server URL:', config.server.url);
console.log('Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
