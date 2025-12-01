import { StateCreator } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types/database';

export interface AuthSlice {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  clearAuth: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user }),
  
  setSession: (session) => set({ session }),
  
  setProfile: (profile) => set({ profile }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setInitialized: (isInitialized) => set({ isInitialized }),
  
  clearAuth: () => set({ 
    user: null, 
    session: null, 
    profile: null,
    isLoading: false,
  }),
});


