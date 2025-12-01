import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ??
  '';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  '';

if (!SUPABASE_URL || SUPABASE_URL === '') {
  console.warn('EXPO_PUBLIC_SUPABASE_URL is not configured in src/utils/supabase.ts');
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === '') {
  console.warn('EXPO_PUBLIC_SUPABASE_ANON_KEY is not configured in src/utils/supabase.ts');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Export URL for OAuth redirects
export const SUPABASE_URL_EXPORT = SUPABASE_URL;
