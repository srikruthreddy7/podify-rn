import { config } from '../utils/config';
import { registerGlobals, AudioSession } from '@livekit/react-native';
import { Room, RoomEvent, Track, RemoteTrack, RemoteParticipant } from 'livekit-client';
import { supabase } from '../utils/supabase';

// Register WebRTC globals for React Native
// This MUST be called before using any LiveKit functionality
registerGlobals();

console.log('✅ WebRTC globals registered for React Native');

// LiveKit client for React Native voice assistant
// Uses @livekit/react-native SDK for real-time audio communication

export interface PodcastContext {
  podcastRssUrl?: string;
  episodeUrl?: string;
  currentTimestamp?: number;
}

export class LiveKitVoiceClient {
  private room: Room | null = null;
  private isConnected = false;
  private isMicEnabled = false;
  private eventsSetup = false;
  private onResponseCallback?: (text: string) => void;
  private onAgentSpeakingCallback?: (isSpeaking: boolean) => void;
  private onDisconnectCallback?: () => void;

  async connect(
    roomName: string = 'podcast-voice-room',
    participantName: string = 'user',
    podcastContext?: PodcastContext
  ) {
    // If already connected, just return
    if (this.isConnected && this.room) {
      console.log('✅ Already connected to LiveKit - reusing connection');
      return;
    }

    // If there's a stale room connection, disconnect it first
    if (this.room) {
      console.log('🧹 Cleaning up stale connection...');
      try {
        await this.room.disconnect();
      } catch (e) {
        console.warn('Error disconnecting stale room:', e);
      }
      this.room = null;
      this.isConnected = false;
      this.eventsSetup = false;
    }

    try {
      console.log('=== Connecting to LiveKit ===');

      // Configure audio session for VoIP
      try {
        await AudioSession.configureAudio({
          android: {
            preferredOutputList: ['speaker'],
            audioTypeOptions: 'communication',
          },
          ios: {
            defaultOutput: 'speaker',
          },
        });
        console.log('✅ Audio session configured for speaker output');
      } catch (audioError) {
        console.warn('⚠️  Failed to configure audio session:', audioError);
        // Continue even if audio config fails
      }

      // Get access token from Supabase edge function
      const token = await this.getAccessToken(roomName, participantName, podcastContext);

      // Create a new room instance
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        // Automatically subscribe to remote audio and video tracks
        autoSubscribe: true,
      });

      // Set up event listeners
      this.setupRoomEvents();

      // Connect to the room
      const url = config.livekit.url;
      console.log('Connecting to LiveKit server:', url);
      console.log('Room name:', roomName);

      await this.room.connect(url, token);

      this.isConnected = true;
      console.log('✅ Connected to LiveKit room successfully');
      console.log('Room participants:', this.room.numParticipants);

    } catch (error) {
      console.error('❌ Failed to connect to LiveKit:', error);
      this.isConnected = false;
      this.room = null;
      throw error;
    }
  }

  private setupRoomEvents() {
    if (!this.room || this.eventsSetup) return;

    this.eventsSetup = true;

    this.room.on(RoomEvent.Connected, () => {
      console.log('🎉 Room connected event fired');
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('👤 Participant connected:', participant.identity);

      // Check if this is the agent
      if (participant.identity.includes('agent')) {
        console.log('🤖 Voice agent joined the room!');
      }
    });

    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
      console.log('📡 Track subscribed:', {
        participant: participant.identity,
        trackKind: track.kind,
        trackSource: publication?.source || 'unknown',
      });

      // Handle agent audio tracks
      if (track.kind === Track.Kind.Audio && participant.identity.includes('agent')) {
        console.log('🔊 Agent audio track received');
        console.log('✅ Audio should play automatically in React Native');

        if (this.onAgentSpeakingCallback) {
          this.onAgentSpeakingCallback(true);
        }
      }
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Audio && participant.identity.includes('agent')) {
        console.log('🔇 Agent stopped speaking');

        if (this.onAgentSpeakingCallback) {
          this.onAgentSpeakingCallback(false);
        }
      }
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('🔌 Disconnected from room');
      this.isConnected = false;
      this.isMicEnabled = false;
      this.eventsSetup = false;

      // Notify the UI that we've disconnected
      if (this.onDisconnectCallback) {
        console.log('📢 Notifying UI of disconnect...');
        this.onDisconnectCallback();
      }
    });

    this.room.on(RoomEvent.Reconnecting, () => {
      console.log('🔄 Reconnecting to room...');
    });

    this.room.on(RoomEvent.Reconnected, () => {
      console.log('✅ Reconnected to room');
    });
  }

  async startListening() {
    if (!this.isConnected || !this.room) {
      throw new Error('Not connected to LiveKit');
    }

    try {
      console.log('🎤 Enabling microphone...');

      // Start the audio session
      try {
        await AudioSession.startAudioSession();
        console.log('✅ Audio session started');
      } catch (audioError) {
        console.warn('⚠️  Failed to start audio session:', audioError);
        // Continue even if this fails
      }

      // Enable the local microphone
      await this.room.localParticipant.setMicrophoneEnabled(true);
      this.isMicEnabled = true;

      console.log('✅ Microphone enabled - agent should start listening');
      console.log('Room state:', {
        connected: this.room.state,
        participants: this.room.numParticipants,
        localTracks: this.room.localParticipant.trackPublications.size,
      });

    } catch (error) {
      console.error('❌ Failed to start listening:', error);
      throw error;
    }
  }

  async stopListening() {
    if (this.room && this.isMicEnabled) {
      console.log('🔇 Disabling microphone...');
      await this.room.localParticipant.setMicrophoneEnabled(false);
      this.isMicEnabled = false;
      console.log('Stopped listening');
    }
  }

  async disconnect() {
    if (!this.room && !this.isConnected) {
      console.log('Already disconnected');
      return;
    }

    console.log('🔌 Disconnecting from LiveKit...');

    try {
      // First, disable the microphone if it's enabled
      if (this.room && this.isMicEnabled) {
        console.log('Disabling microphone before disconnect...');
        try {
          await this.room.localParticipant.setMicrophoneEnabled(false);
        } catch (error) {
          console.warn('⚠️  Failed to disable microphone:', error);
        }
      }

      // Stop audio session
      try {
        await AudioSession.stopAudioSession();
        console.log('✅ Audio session stopped');
      } catch (error) {
        console.warn('⚠️  Failed to stop audio session:', error);
      }

      // Disconnect from the room
      if (this.room) {
        await this.room.disconnect();
        this.room = null;
      }

      // Reset all state
      this.isConnected = false;
      this.isMicEnabled = false;
      this.eventsSetup = false;

      // Clear all callbacks
      this.onResponseCallback = undefined;
      this.onAgentSpeakingCallback = undefined;
      this.onDisconnectCallback = undefined;

      console.log('✅ Fully disconnected from LiveKit and cleaned up');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
      // Force cleanup even if there was an error
      this.room = null;
      this.isConnected = false;
      this.isMicEnabled = false;
      this.eventsSetup = false;

      // Clear all callbacks even on error
      this.onResponseCallback = undefined;
      this.onAgentSpeakingCallback = undefined;
      this.onDisconnectCallback = undefined;
    }
  }

  private async getAccessToken(
    roomName: string,
    participantName: string = 'user',
    podcastContext?: PodcastContext
  ): Promise<string> {
    console.log('=== LiveKit Token Request ===');
    console.log('Requesting token from Supabase edge function');
    console.log('Room name:', roomName);
    console.log('Participant name:', participantName);
    if (podcastContext) {
      console.log('Podcast context:', podcastContext);
    }

    try {
      const requestBody: any = {
        roomName,
        participantName
      };

      // Include podcast context if provided
      if (podcastContext?.podcastRssUrl) {
        requestBody.podcastRssUrl = podcastContext.podcastRssUrl;
      }
      if (podcastContext?.episodeUrl) {
        requestBody.episodeUrl = podcastContext.episodeUrl;
      }
      if (podcastContext?.currentTimestamp !== undefined) {
        requestBody.currentTimestamp = podcastContext.currentTimestamp;
      }

      console.log('Invoking Supabase function: swift-endpoint');
      const { data, error } = await supabase.functions.invoke('swift-endpoint', {
        body: requestBody,
      });

      if (error) {
        console.error('Error invoking Supabase function livekit-token:', error);
        throw new Error(error.message || 'Failed to generate access token');
      }

      if (!data?.token || typeof data.token !== 'string') {
        console.error('Invalid token received:', data);
        throw new Error('Server returned invalid token');
      }

      console.log('✅ Token received successfully from Supabase');
      return data.token;
    } catch (error) {
      console.error('Failed to get LiveKit token:', error);
      console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to authenticate with LiveKit');
    }
  }

  private handleTranscription(text: string) {
    console.log('📝 User said:', text);

    // TODO: Parse the transcription into an intent
    // For now, just log it
    if (this.onResponseCallback) {
      this.onResponseCallback(text);
    }
  }

  private handleAgentResponse(text: string) {
    console.log('🤖 Agent said:', text);

    if (this.onResponseCallback) {
      this.onResponseCallback(text);
    }
  }

  onResponse(callback: (text: string) => void) {
    this.onResponseCallback = callback;
  }

  onAgentSpeaking(callback: (isSpeaking: boolean) => void) {
    this.onAgentSpeakingCallback = callback;
  }

  onDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback;
  }

  isActive(): boolean {
    return this.isConnected;
  }

  isMicrophoneEnabled(): boolean {
    return this.isMicEnabled;
  }

  getRoomState() {
    if (!this.room) return null;

    return {
      connected: this.isConnected,
      numParticipants: this.room.numParticipants,
      localTracks: this.room.localParticipant.trackPublications.size,
    };
  }
}

// Singleton instance
export const voiceClient = new LiveKitVoiceClient();
