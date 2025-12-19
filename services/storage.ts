import { AppState, WeeklyPlan, DailyLog } from '../types';
import { DEFAULT_PLAN } from '../constants';
import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'gym_genius_data_v1';

// Supabase Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Default to checking for env vars availability
const getIsConfigured = () => {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

// Initialize Supabase Client
const supabase = getIsConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// Helper to load from LocalStorage as a fallback
const loadFromLocal = (): AppState => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      return {
        weeklyPlan: DEFAULT_PLAN,
        logs: {},
        defaultRestTimer: 120
      };
    }
    return JSON.parse(serialized);
  } catch (e) {
    console.error("Failed to load local data", e);
    return {
      weeklyPlan: DEFAULT_PLAN,
      logs: {},
      defaultRestTimer: 120
    };
  }
};

interface LoadResult {
  data: AppState;
  source: 'cloud' | 'local';
}

// Async load function favoring Supabase but falling back to LocalStorage
export const loadData = async (): Promise<LoadResult> => {
  if (!supabase) {
    console.warn("Supabase not configured. Using local storage.");
    return { data: loadFromLocal(), source: 'local' };
  }

  try {
    console.log(`Attempting to sync with Supabase...`);

    // We assume a simple table 'user_data' with columns: id (string), data (jsonb)
    // We use a fixed ID 'default-user' for this single-user version
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('id', 'default-user')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
      console.warn("Supabase error:", error.message);
    }

    if (data) {
      console.log("✅ Loaded data from Supabase");
      // Update local storage with fresh cloud data
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.data));
      } catch (e) { console.warn("Failed to update local cache"); }
      return { data: data.data, source: 'cloud' };
    } else {
      console.log("Connected to Supabase but no data found. Using local default.");
      return { data: loadFromLocal(), source: 'cloud' };
    }

  } catch (error) {
    console.warn("❌ Could not reach Supabase. Falling back to local storage.", error);
  }

  return { data: loadFromLocal(), source: 'local' };
};

export const saveData = async (data: AppState): Promise<boolean> => {
  // 1. Always save to LocalStorage for redundancy/offline safety
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to local storage", e);
  }

  // 2. Try to save to Supabase
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('user_data')
      .upsert({
        id: 'default-user',
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (!error) {
      console.log("✅ Saved to Cloud");
      return true;
    } else {
      console.warn("❌ Failed to save to Cloud:", error.message);
      return false;
    }
  } catch (error) {
    console.error("❌ Failed to save to Supabase:", error);
    return false;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Deprecated functions kept for compatibility
export const getCurrentApiUrl = () => "Supabase";
export const setCustomApiUrl = (url: string) => { console.log("Custom URL not supported", url); };
export const resetApiUrl = () => { };