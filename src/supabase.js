import { createClient } from '@supabase/supabase-js'
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const projectRef = supabaseUrl ? new URL(supabaseUrl).hostname.split('.')[0] : null
export const authStorageKey = projectRef ? `sb-${projectRef}-auth-token` : null

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: authStorageKey,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null
