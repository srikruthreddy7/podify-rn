import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../utils/supabase';
import { useStore } from '../store';
import { authService } from '../services/authService';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { 
    user, 
    session, 
    profile,
    isLoading, 
    isInitialized,
    setUser, 
    setSession, 
    setProfile,
    setLoading, 
    setInitialized,
    clearAuth,
  } = useStore();

  useEffect(() => {
    // Initialize auth state
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && newSession) {
          setSession(newSession);
          setUser(newSession.user);
          
          // Fetch user profile
          const userProfile = await authService.getUserProfile(newSession.user.id);
          setProfile(userProfile);
        } else if (event === 'SIGNED_OUT') {
          clearAuth();
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      
      // Get existing session
      const currentSession = await authService.getSession();
      
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        
        // Fetch user profile
        const userProfile = await authService.getUserProfile(currentSession.user.id);
        setProfile(userProfile);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      clearAuth();
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const result = await authService.signInWithGoogle();
    setLoading(false);
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    const result = await authService.signOut();
    if (result.success) {
      clearAuth();
    }
    setLoading(false);
    return result;
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isInitialized,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


