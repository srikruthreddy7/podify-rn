// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';
import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';

const PODCAST_INDEX_BASE_URL = 'https://api.podcastindex.org/api/1.0';

interface PodcastIndexRequest {
  action: 'trending' | 'search' | 'categories';
  params?: {
    max?: number;
    category?: string;
    lang?: string;
    term?: string;
  };
}

/**
 * Generate authentication headers for Podcast Index API
 */
async function generateAuthHeaders(
  apiKey: string,
  apiSecret: string
): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000);

  // Create authorization hash: SHA-1(apiKey + apiSecret + timestamp)
  const authString = apiKey + apiSecret + timestamp.toString();
  const msgUint8 = new TextEncoder().encode(authString);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const authHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return {
    'User-Agent': 'PodcastAssist/1.0',
    'X-Auth-Key': apiKey,
    'X-Auth-Date': timestamp.toString(),
    'Authorization': authHash,
  };
}

/**
 * Call Podcast Index API with authentication
 */
async function callPodcastIndexAPI(
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any> {
  const apiKey = Deno.env.get('PODCAST_INDEX_API_KEY');
  const apiSecret = Deno.env.get('PODCAST_INDEX_API_SECRET');

  if (!apiKey || !apiSecret) {
    throw new Error('Podcast Index API credentials not configured');
  }

  const url = new URL(`${PODCAST_INDEX_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const headers = await generateAuthHeaders(apiKey, apiSecret);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Podcast Index API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return await response.json();
}

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { action, params = {} }: PodcastIndexRequest = await req.json();

    let endpoint = '';
    let queryParams: Record<string, string> = {};

    switch (action) {
      case 'trending':
        endpoint = '/podcasts/trending';
        queryParams = {
          max: (params.max || 20).toString(),
          ...(params.category && { cat: params.category }),
          ...(params.lang && { lang: params.lang }),
        };
        break;

      case 'search':
        if (!params.term) {
          return errorResponse('Search term is required', 400);
        }
        endpoint = '/search/byterm';
        queryParams = {
          q: params.term,
          max: (params.max || 20).toString(),
        };
        break;

      case 'categories':
        endpoint = '/categories/list';
        break;

      default:
        return errorResponse('Invalid action. Use: trending, search, or categories', 400);
    }

    const data = await callPodcastIndexAPI(endpoint, queryParams);
    return jsonResponse(data);
  } catch (error) {
    console.error('Error in podcast-index function:', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
});
