import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/config';
import { getSupabase } from '../services/supabase';
import { SoundService } from './sound';
import { CollectionService } from './collection';

interface UserProfile {
  display_name: string;
  email: string;
  subscription_tier: 'basic' | 'premium';
  created_at: string;
  pets: {
    id: string;
    name: string;
    type: string;
  }[];
  active_collection?: {
    id: string;
    name: string;
    sounds_count: number;
  };
}

const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  USER_SETTINGS: 'user_settings',
};

export class UserService {
  private static instance: UserService;
  private supabase = getSupabase();
  private soundService: SoundService;
  private collectionService: CollectionService;

  private constructor() {
    this.soundService = SoundService.getInstance();
    this.collectionService = CollectionService.getInstance();
  }

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async initializeUserCache(session?: any) {
    try {
      console.log('Initializing user cache...');
      
      let userId;
      let userEmail;

      if (session) {
        userId = session.user.id;
        userEmail = session.user.email;
      } else {
        const { data } = await this.supabase.auth.getSession();
        if (!data?.session?.user) {
          throw new Error('Not authenticated');
        }
        userId = data.session.user.id;
        userEmail = data.session.user.email;
      }

      console.log('Got user ID:', userId);

      // Get profile from API
      const response = await fetch(`${API_CONFIG.url}/users/${userId}`);
      console.log('Fetched user profile from API, status:', response.status);

      // If profile doesn't exist, create it
      if (response.status === 404) {
        console.log('Creating new user profile...');
        const createResponse = await fetch(`${API_CONFIG.url}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: userId,
            email: userEmail,
          }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create user profile');
        }

        const profile = await createResponse.json();
        await AsyncStorage.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(profile));
        console.log('Created and cached new profile');
        return profile;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const profile = await response.json();
      await AsyncStorage.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(profile));
      console.log('Cached existing profile');
      return profile;
    } catch (error) {
      console.error('Error initializing user cache:', error);
      throw error;
    }
  }

  async getUserProfile() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEYS.USER_PROFILE);
      if (cached) {
        return JSON.parse(cached);
      }
      return await this.initializeUserCache();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(updates: Partial<UserProfile>) {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .update(updates)
        .select()
        .single();

      if (error) throw error;

      // Update cache
      await AsyncStorage.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(profile));
      return profile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Call this on logout
  async clearCache() {
    await AsyncStorage.removeItem(CACHE_KEYS.USER_PROFILE);
  }

  async addPet(petData: { name: string; type: string }) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/pets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...petData,
          user_id: user.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to add pet');

      const newPet = await response.json();
      await this.clearCache();
      return newPet;
    } catch (error) {
      console.error('Error adding pet:', error);
      throw error;
    }
  }

  async clearUserData() {
    // Clear all cached data
    await AsyncStorage.removeItem(CACHE_KEYS.USER_PROFILE);
    
    // Clear loaded sounds
    await this.soundService.unloadAll();
    
    // Reset any active collections
    await this.collectionService.resetActiveCollection();
  }

  async handleLogout() {
    await this.clearUserData();
    await this.clearCache();
    await this.supabase.auth.signOut();
  }

  async deleteAccount() {
    try {
      await this.clearUserData();
      await this.supabase.rpc('delete_user_account');
      await this.supabase.auth.signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
} 