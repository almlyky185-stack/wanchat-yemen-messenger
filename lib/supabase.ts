import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

export type WanchatProfile = {
  user_id: string;
  display_name: string;
  language: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type WanchatMessage = {
  id: string;
  user_id: string;
  room_id: string;
  body: string;
  created_at: string;
};

export type WanchatStatus = {
  id: string;
  user_id: string;
  body: string;
  media_url: string | null;
  created_at: string;
  expires_at: string;
};

export type WanchatConsent = {
  id: string;
  user_id: string;
  policy_version: string;
  accepted_at: string;
  language: string;
  created_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Database = {
  public: {
    Tables: {
      wanchat_profiles: Table<WanchatProfile, Omit<WanchatProfile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }>;
      wanchat_messages: Table<WanchatMessage, Omit<WanchatMessage, 'id' | 'created_at'> & { id?: string; created_at?: string }>;
      wanchat_statuses: Table<WanchatStatus, Omit<WanchatStatus, 'id' | 'created_at' | 'expires_at' | 'media_url'> & { id?: string; created_at?: string; expires_at?: string; media_url?: string | null }>;
      wanchat_consents: Table<WanchatConsent, Omit<WanchatConsent, 'id' | 'created_at'> & { id?: string; created_at?: string }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const MEDIA_BUCKET = 'wanchat-media';

// These are public client settings (the publishable key is safe to ship in an app).
// Environment variables can override them for other deployment environments.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || 'https://ipjsykwxqfaujsreacjj.supabase.co';
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || 'sb_publishable_jUF0FqUxPSyvqTxHEJPL1w_jwy_yDGN';

// Keep the native app bootable even when cloud environment variables are missing.
// Requests will fail visibly until the real Supabase values are configured.
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'missing-supabase-publishable-key',
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  },
);

export function getAuthRedirectUrl() {
  return Platform.OS === 'web'
    ? `${window.location.origin}/auth/callback`
    : Linking.createURL('auth/callback');
}
