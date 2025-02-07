import { getSupabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
    if (!hasCompletedOnboarding) {
      router.replace('/onboarding');
    } else {
      router.replace('/(authenticated)/');
    }

    return data;
  },

  async signUp(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'petportrait://auth/callback',
      }
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;

    await AsyncStorage.removeItem('hasCompletedOnboarding');
    router.replace('/(auth)/login');
  },

  async resetPassword(email: string) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: 'petportrait://auth/reset-password',
    });

    if (error) throw error;
  },

  async deleteAccount() {
    const { error } = await getSupabase().auth.admin.deleteUser(
      (await getSupabase().auth.getUser()).data.user?.id as string
    );
    
    if (error) throw error;

    await AsyncStorage.removeItem('hasCompletedOnboarding');
    await this.signOut();
  }
}; 