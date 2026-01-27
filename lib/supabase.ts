import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Supabase session storage
 * Uses AsyncStorage because SecureStore has a 2KB limit
 */
const SupabaseStorage = {
  getItem: async (key: string) => {
    return AsyncStorage.getItem(key)
  },
  setItem: async (key: string, value: string) => {
    return AsyncStorage.setItem(key, value)
  },
  removeItem: async (key: string) => {
    return AsyncStorage.removeItem(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: SupabaseStorage,
  },
})
