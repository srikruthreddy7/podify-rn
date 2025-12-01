import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';

export const EXPO_PUBLIC_LIVEKIT_WS_URL =
  process.env.EXPO_PUBLIC_LIVEKIT_WS_URL ??
  Constants.expoConfig?.extra?.EXPO_PUBLIC_LIVEKIT_WS_URL ??
  '';

/**
 * Retrieves LiveKit connection details (URL and token) by invoking
 * a Supabase edge function.
 *
 * @param roomName The name of the room to join (e.g., session details like time, day, etc).
 * @param participantName The name of the participant (e.g., user name).
 */
export function useConnectionDetails(
  roomName?: string,
  participantName?: string,
): ConnectionDetails | undefined {
  const [details, setDetails] = useState<ConnectionDetails | undefined>(undefined);

  useEffect(() => {
    if (!roomName || !participantName || !EXPO_PUBLIC_LIVEKIT_WS_URL) {
      setDetails(undefined);
      if (!EXPO_PUBLIC_LIVEKIT_WS_URL || EXPO_PUBLIC_LIVEKIT_WS_URL === '') {
        console.warn('LiveKit WebSocket URL is not configured in useConnectionDetails.ts');
      }
      return;
    }

    const getToken = async () => {
      try {
        console.log(`Requesting token for room: ${roomName}, participant: ${participantName}`);

        const requestBody = {
          roomName,
          participantName
        };

        const { data, error } = await supabase.functions.invoke('swift-endpoint', {
          body: requestBody,
        });

        if (error) {
          console.error('Error invoking Supabase function livekit-token:', error);
          throw new Error(error.message || 'Failed to generate access token');
        }

        if (data?.token) {
          console.log('Token received successfully.');
          setDetails({
            url: EXPO_PUBLIC_LIVEKIT_WS_URL,
            token: data.token,
          });

          console.log('Token:', data.token);
          console.log('URL:', EXPO_PUBLIC_LIVEKIT_WS_URL);
        } else {
          console.error('Token not found in response from Supabase function:', data);
          throw new Error('Token not found in Supabase function response');
        }
      } catch (error) {
        console.error('Error fetching LiveKit token:', error);
        setDetails(undefined); // Clear details on error
      }
    };

    getToken();
  }, [roomName, participantName]);

  return details;
}

type ConnectionDetails = {
  url: string;
  token: string;
};
