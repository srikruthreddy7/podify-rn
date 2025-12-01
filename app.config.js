module.exports = {
  expo: {
    name: 'Podify',
    slug: 'podify-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: 'podify',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.podify.app',
      infoPlist: {
        UIBackgroundModes: ['audio'],
        NSMicrophoneUsageDescription:
          'This app needs microphone access for voice commands and the voice assistant feature.',
      },
    },
    android: {
      package: 'com.podify.app',
      permissions: [
        'FOREGROUND_SERVICE',
        'RECORD_AUDIO',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
      ],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'podify',
              host: 'auth',
              pathPrefix: '/callback',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-build-properties',
        {
          android: {
            minSdkVersion: 24,
          },
        },
      ],
    ],
    extra: {
      EXPO_PUBLIC_LIVEKIT_WS_URL: process.env.EXPO_PUBLIC_LIVEKIT_WS_URL,
      LIVEKIT_URL: process.env.LIVEKIT_URL || process.env.EXPO_PUBLIC_LIVEKIT_WS_URL,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      SERVER_URL: process.env.SERVER_URL,
      PODCAST_INDEX_API_KEY: process.env.PODCAST_INDEX_API_KEY,
      PODCAST_INDEX_API_SECRET: process.env.PODCAST_INDEX_API_SECRET,
    },
  },
};
