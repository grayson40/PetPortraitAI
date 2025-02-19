import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { SUPABASE_CONFIG } from '../constants/config';

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration.');
}

/**
 * Create the supabase client
 * @returns The supabase client
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      async getItem(key: string) {
        try {
          return await SecureStore.getItemAsync(key);
        } catch (e) {
          console.error('Error getting item from SecureStore:', e);
          return null;
        }
      },
      async setItem(key: string, value: string) {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch (e) {
          console.error('Error setting item in SecureStore:', e);
        }
      },
      async removeItem(key: string) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (e) {
          console.error('Error removing item from SecureStore:', e);
        }
      },
    },
  },
});

// For backward compatibility
export const getSupabase = () => supabase; 