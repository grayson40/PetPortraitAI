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
  private userCache: any = null;
  private listeners: (() => void)[] = [];

  private constructor() {
    this.soundService = SoundService.getInstance();
    this.collectionService = CollectionService.getInstance();
  }

  /**
   * Get the instance of the UserService
   * @returns The instance of the UserService
   */
  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  /**
   * Initialize the cache
   * @returns The cache
   */
  async initializeCache(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) {
        this.userCache = null;
        return;
      }

      // Always fetch fresh data from API
      const response = await fetch(`${API_CONFIG.url}/users/${session.user.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch user profile:', await response.text());
        this.userCache = null;
        return;
      }

      // Update cache with fresh data
      const profile = await response.json();
      this.userCache = profile;
      await AsyncStorage.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(profile));
      
      // Notify listeners of update
      this.notifyListeners();
    } catch (error) {
      console.error('Error initializing user cache:', error);
      this.userCache = null;
    }
  }

  /**
   * Initialize the user cache
   * @param session - The session
   * @returns The user cache
   */
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

  /**
   * Get the user profile
   * @returns The user profile
   */
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

  /**
   * Update the user profile
   * @param updates - The updates to the user profile
   * @returns The updated user profile
   */
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

  /**
   * Clear the cache
   */
  async clearCache() {
    this.userCache = null;
    // Notify listeners that cache was cleared
    this.notifyListeners();
  }

  /**
   * Notify listeners
   */
  private notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  /**
   * Subscribe to updates
   * @param callback - The callback to subscribe to
   * @returns The unsubscribe function
   */
  subscribeToUpdates(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Add a pet
   * @param petData - The pet data
   * @returns The added pet
   */
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

  /**
   * Clear the user data
   */
  async clearUserData() {
    // Clear all cached data
    await AsyncStorage.removeItem(CACHE_KEYS.USER_PROFILE);
    
    // Clear loaded sounds
    await this.soundService.unloadAll();
    
    // Reset any active collections
    await this.collectionService.resetActiveCollection();
  }

  /**
   * Handle logout
   */
  async handleLogout() {
    await this.clearUserData();
    await this.clearCache();
    await this.supabase.auth.signOut();
  }

  /**
   * Delete the account
   */
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

  /**
   * Update the subscription
   * @param subscriptionTier - The subscription tier
   * @returns The updated subscription
   */
  async updateSubscription(subscriptionTier: 'basic' | 'premium') {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) throw new Error('No authenticated user');

      // Update auth metadata to trigger USER_UPDATED event
      const { error: authError } = await this.supabase.auth.updateUser({
        data: {
          subscription_tier: subscriptionTier,
          updated_at: new Date().toISOString(),
        }
      });

      if (authError) throw authError;

      // Wait for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear just the profile cache, keep session
      this.userCache = null;
      await AsyncStorage.removeItem(CACHE_KEYS.USER_PROFILE);
      
      // Get fresh data with current session
      const response = await fetch(`${API_CONFIG.url}/users/${session.user.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch updated profile');
      }

      // Update cache with fresh data
      const freshProfile = await response.json();
      this.userCache = freshProfile;
      await AsyncStorage.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(freshProfile));
      
      // Notify listeners of update
      this.notifyListeners();

      return freshProfile;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Check if the subscription is premium
   * @returns True if the subscription is premium, false otherwise
   */
  isSubscriptionPremium(): boolean {
    return this.userCache?.subscription_tier === 'premium';
  }

  /**
   * Get the current subscription tier
   * @returns The current subscription tier
   */
  getSubscriptionTier(): 'basic' | 'premium' {
    return this.userCache?.subscription_tier || 'basic';
  }

  /**
   * Refresh the profile
   * @returns The refreshed profile
   */
  async refreshProfile(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      if (!session?.user) throw new Error('No authenticated user');

      // Clear cache first
      this.userCache = null;
      await AsyncStorage.removeItem(CACHE_KEYS.USER_PROFILE);

      // Fetch fresh data
      const response = await fetch(`${API_CONFIG.url}/users/${session.user.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Failed to refresh profile');

      // Update cache with fresh data
      const profile = await response.json();
      this.userCache = profile;
      await AsyncStorage.setItem(CACHE_KEYS.USER_PROFILE, JSON.stringify(profile));
      
      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.error('Error refreshing profile:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const userService = UserService.getInstance(); 