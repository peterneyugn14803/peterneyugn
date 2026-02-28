import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: SUPABASE_ANON_KEY');
}

export type Post = {
  id: string;
  title: string;
  content: string | null;
  media_id: string | null;
  profile_id: string;
  created_at: string;
};

export type Media = {
  id: string;
  post_id: string;
  type: 'image' | 'video' | 'audio' | 'other';
  url: string;
  alt_text: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
