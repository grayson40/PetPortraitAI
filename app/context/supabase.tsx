import { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import 'react-native-url-polyfill/auto';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

const createSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
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
};

interface SupabaseContextType {
  supabase: SupabaseClient | null;
  initialized: boolean;
}

const SupabaseContext = createContext<SupabaseContextType>({ 
  supabase: null, 
  initialized: false 
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const client = createSupabaseClient();
    setSupabase(client);
    setInitialized(true);
  }, []);

  return (
    <SupabaseContext.Provider value={{ supabase, initialized }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context.initialized) {
    throw new Error('Supabase not initialized');
  }
  return context.supabase!;
}; 