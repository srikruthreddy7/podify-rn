# Podify

A modern podcast app for iOS and Android with voice assistant integration, built with React Native and Expo.

![React Native](https://img.shields.io/badge/React%20Native-0.81-blue)
![Expo](https://img.shields.io/badge/Expo-54-000020)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Core Functionality
- **Library Management** – Subscribe to podcasts via RSS feeds
- **Discovery** – Search and browse podcasts using Podcast Index API
- **Audio Playback** – Background audio with lock screen controls, ±15s seek, variable playback speed
- **Offline Downloads** – Download episodes for offline playback
- **Transcripts** – Support for Podcasting 2.0 transcript tags

### Voice Assistant
- **Push-to-Talk** – Voice control for hands-free operation
- **Intent Recognition** – Parse commands like "pause", "back 15 seconds", "set speed to 1.5x"
- **Context-Aware Q&A** – Ask questions about the current episode segment
- **LiveKit Integration** – Real-time audio streaming for STT → LLM → TTS pipeline

### Supported Voice Commands
- **Playback**: "pause", "play", "resume"
- **Navigation**: "back 15 seconds", "forward 30 seconds", "jump to 12:30"
- **Speed Control**: "set speed to 1.5"
- **Chapters**: "next chapter", "previous chapter"
- **Bookmarks**: "bookmark this", "show bookmarks"
- **Q&A**: "summarize the last minute", "explain [term]", "what is [topic]?"

## Tech Stack

- **Framework**: React Native + Expo
- **Language**: TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Audio**: react-native-track-player
- **Voice**: LiveKit
- **Backend**: Supabase (Auth, Database, Edge Functions)
- **Styling**: NativeWind (Tailwind CSS)

## Project Structure

```
podify-app/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Main app screens
│   │   ├── LibraryScreen.tsx
│   │   ├── DiscoverScreen.tsx
│   │   ├── NowPlayingScreen.tsx
│   │   ├── EpisodeListScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── navigation/       # React Navigation setup
│   ├── store/            # Zustand state slices
│   ├── services/         # Business logic
│   │   ├── audioPlayer.ts
│   │   ├── rssParser.ts
│   │   ├── downloadService.ts
│   │   ├── transcriptService.ts
│   │   └── syncService.ts
│   ├── voice/            # Voice assistant
│   │   ├── intentRouter.ts
│   │   └── LiveKitVoiceClient.ts
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── types/            # TypeScript interfaces
│   └── utils/            # Helper functions
├── supabase/             # Supabase configuration
│   └── functions/        # Edge functions
├── __tests__/            # Jest tests
└── assets/               # Images and mock data
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (macOS) or Android Studio
- Supabase account (for backend services)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/podify-app.git
   cd podify-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the project root:
   ```env
   # Supabase
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # LiveKit (optional, for voice features)
   EXPO_PUBLIC_LIVEKIT_WS_URL=wss://your-livekit-server.com
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/simulator**
   ```bash
   # iOS (requires macOS)
   npm run ios
   
   # Android
   npm run android
   ```

### Building Native Apps

Since this app uses native modules (react-native-track-player), you need to create a development build:

```bash
# Generate native projects
npx expo prebuild

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## Supabase Setup

The app uses Supabase for authentication, database, and edge functions.

### Database Tables

- `user_profiles` – User profile information
- `user_subscriptions` – Podcast subscriptions
- `listening_history` – Episode listening history
- `playback_progress` – Playback position sync

### Edge Functions

- `podcast-index` – Proxy for Podcast Index API
- `swift-endpoint` – LiveKit token generation

### Required Secrets

Set these in your Supabase project:
```bash
supabase secrets set PODCAST_INDEX_API_KEY=your_key
supabase secrets set PODCAST_INDEX_API_SECRET=your_secret
supabase secrets set LIVEKIT_API_KEY=your_livekit_key
supabase secrets set LIVEKIT_API_SECRET=your_livekit_secret
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Architecture

### State Management

Five Zustand slices manage app state:
- **PlayerSlice** – Playback state (position, duration, isPlaying, rate)
- **FeedsSlice** – Shows and episodes
- **TranscriptsSlice** – Episode transcripts with timestamp indexing
- **BookmarksSlice** – User bookmarks
- **DownloadsSlice** – Download state and offline files

### Voice Pipeline

```
User Voice (Push-to-Talk)
  ↓ LiveKit WebRTC
Server STT (Speech-to-Text)
  ↓
Intent Router (Parse → Execute or Query)
  ↓
Local Action OR LLM Query
  ↓
TTS Response
  ↓ LiveKit WebRTC
User Hears Response
```

### Performance Targets

- Local commands (pause, seek): <500ms latency
- Q&A responses: <3s (including TTS)
- Transcript search: <100ms
- Background audio: Continues with screen off

## CI/CD

GitHub Actions workflows are included for:
- **Lint and Test** – TypeScript checking and Jest tests
- **Build iOS** – Creates unsigned IPA for sideloading
- **Build Android** – Creates release APK

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. Follow the existing code style
2. Write tests for new features
3. Update documentation as needed
4. Create descriptive commit messages

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Expo](https://expo.dev/) – React Native framework
- [LiveKit](https://livekit.io/) – Real-time voice infrastructure
- [Supabase](https://supabase.com/) – Backend as a service
- [Podcast Index](https://podcastindex.org/) – Open podcast directory
