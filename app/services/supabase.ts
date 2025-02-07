import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

// Initialize Supabase client
let supabaseInstance: ReturnType<typeof createClient>;

export const initializeSupabase = () => {
  if (!supabaseInstance) {
    const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
    const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration.');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
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
  }
  return supabaseInstance;
};

export const getSupabase = () => {
  if (!supabaseInstance) {
    return initializeSupabase();
  }
  return supabaseInstance;
}; 