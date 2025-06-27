import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

const createSupabaseClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'sb-session-key',
    storage: {
      getItem: (key) => {
        try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : null;
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch {
          // Ignore storage errors
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore storage errors
        }
      }
    }
  },
  global: {
    headers: {
      'Cache-Control': 'no-cache'
    }
  }
});

export const getSupabase = () => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
};

export const resetSupabaseClient = () => {
  supabaseInstance = null;
};

export const supabase = getSupabase();