import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AccessToken } from 'https://deno.land/x/livekit_server_sdk@1.2.7/mod.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

interface TokenRequest {
  roomName: string;
  participantName: string;
  podcastRssUrl?: string;
  episodeUrl?: string;
  currentTimestamp?: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { roomName, participantName, podcastRssUrl, episodeUrl, currentTimestamp }: TokenRequest = await req.json();

    if (!roomName || !participantName) {
      return errorResponse('roomName and participantName are required', 400);
    }

    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!apiKey || !apiSecret) {
      console.error('LiveKit API credentials not configured');
      return errorResponse('LiveKit API credentials not configured', 500);
    }

    console.log('Generating LiveKit token for:', {
      roomName,
      participantName,
      hasPodcastContext: !!(podcastRssUrl || episodeUrl),
    });

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      // Token expires in 24 hours
      ttl: '24h',
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Add podcast context as metadata if provided
    if (podcastRssUrl || episodeUrl || currentTimestamp !== undefined) {
      at.metadata = JSON.stringify({
        podcastRssUrl,
        episodeUrl,
        currentTimestamp,
      });
    }

    const token = at.toJwt();

    console.log('Token generated successfully');

    return jsonResponse({ token });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});
