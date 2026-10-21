import { createClient } from '@supabase/supabase-js';

// Publishable key: safe in the browser. Row Level Security in the database decides what it can read or write.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = url && key ? createClient(url, key) : null;

if (!supabase) {
  console.warn('Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local');
}

// Public URL for a file in the media bucket
export function mediaUrl(path) {
  if (!path || !supabase) return '';
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}
