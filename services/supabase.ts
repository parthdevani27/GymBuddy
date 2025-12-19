
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
// Defaults to empty string to prevent crashes if env vars are missing, 
// though functionality will be limited.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
    return !!(SUPABASE_URL && SUPABASE_KEY);
};

export const supabase = isSupabaseConfigured()
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
