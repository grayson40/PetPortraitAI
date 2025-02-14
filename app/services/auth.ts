import { getSupabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_CONFIG } from '../constants/config';

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

    const userId = data.user?.id;
    if (userId) {
      const response = await fetch(`${API_CONFIG.url}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
          email: email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add user to the database');
      }
    }

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
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      const userId = user?.id as string;

      const response = await fetch(`${API_CONFIG.url}/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user from the database');
      } 

      const { error } = await getSupabase().auth.admin.deleteUser(userId);
      
      if (error) throw error;

      await AsyncStorage.removeItem('hasCompletedOnboarding');
      await this.signOut();
    } catch (error) {
      throw new Error(`Failed to delete account: ${(error as Error).message}`);
    }
  }
}; 