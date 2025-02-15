import { getSupabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_CONFIG } from '../constants/config';
import { userService } from './user';

export const authService = {
  async signIn(email: string, password: string) {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // On sign in, go directly to main app
    router.replace('/(authenticated)/(tabs)');

    return data;
  },

  async signUp(email: string, password: string, name: string) {
    // 1. First create the auth user
    const { data: authData, error: authError } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('No user data returned');

    try {
      // 2. Create the user profile in our database
      const response = await fetch(`${API_CONFIG.url}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: authData.user.id,
          email: email,
          display_name: name,
          subscription_tier: 'basic',
          sound_volume: 80,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to create user profile:', errorData);
        // Clean up auth user if profile creation fails
        await getSupabase().auth.signOut();
        throw new Error('Failed to create user profile');
      }

      // 3. Set onboarding flag and redirect
      await AsyncStorage.setItem('needsOnboarding', 'true');
      router.replace('/onboarding');

      return authData;
    } catch (error) {
      console.error('Error in signup process:', error);
      // Clean up if anything fails
      await getSupabase().auth.signOut();
      throw error;
    }
  },

  async signOut() {
    const { error } = await getSupabase().auth.signOut();
    if (error) throw error;

    // Clear all onboarding flags
    await AsyncStorage.removeItem('needsOnboarding');
    
    // Go to landing instead of login
    router.replace('/(auth)');
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

      // Clear flags and go to landing
      await AsyncStorage.removeItem('needsOnboarding');
      router.replace('/(auth)');
    } catch (error) {
      throw new Error(`Failed to delete account: ${(error as Error).message}`);
    }
  }
}; 