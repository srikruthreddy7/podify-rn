// Supabase Database types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      listening_history: {
        Row: {
          audio_url: string | null
          completed: boolean | null
          duration: number | null
          episode_id: string
          episode_image_url: string | null
          episode_title: string | null
          id: string
          last_played_at: string | null
          show_id: string
          show_image_url: string | null
          show_title: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          completed?: boolean | null
          duration?: number | null
          episode_id: string
          episode_image_url?: string | null
          episode_title?: string | null
          id?: string
          last_played_at?: string | null
          show_id: string
          show_image_url?: string | null
          show_title?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          completed?: boolean | null
          duration?: number | null
          episode_id?: string
          episode_image_url?: string | null
          episode_title?: string | null
          id?: string
          last_played_at?: string | null
          show_id?: string
          show_image_url?: string | null
          show_title?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      playback_progress: {
        Row: {
          duration: number
          episode_id: string
          id: string
          playback_rate: number | null
          position: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          duration?: number
          episode_id: string
          id?: string
          playback_rate?: number | null
          position?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          duration?: number
          episode_id?: string
          id?: string
          playback_rate?: number | null
          position?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          feed_url: string
          id: string
          show_author: string | null
          show_id: string
          show_image_url: string | null
          show_title: string | null
          subscribed_at: string | null
          user_id: string
        }
        Insert: {
          feed_url: string
          id?: string
          show_author?: string | null
          show_id: string
          show_image_url?: string | null
          show_title?: string | null
          subscribed_at?: string | null
          user_id: string
        }
        Update: {
          feed_url?: string
          id?: string
          show_author?: string | null
          show_id?: string
          show_image_url?: string | null
          show_title?: string | null
          subscribed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type ListeningHistory = Database['public']['Tables']['listening_history']['Row']
export type ListeningHistoryInsert = Database['public']['Tables']['listening_history']['Insert']
export type ListeningHistoryUpdate = Database['public']['Tables']['listening_history']['Update']

export type PlaybackProgress = Database['public']['Tables']['playback_progress']['Row']
export type PlaybackProgressInsert = Database['public']['Tables']['playback_progress']['Insert']
export type PlaybackProgressUpdate = Database['public']['Tables']['playback_progress']['Update']

export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row']
export type UserSubscriptionInsert = Database['public']['Tables']['user_subscriptions']['Insert']
export type UserSubscriptionUpdate = Database['public']['Tables']['user_subscriptions']['Update']
