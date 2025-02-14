import { CacheService } from './cache';
import { getSupabase } from './supabase';
import { API_CONFIG } from '../constants/config';

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
  private cacheService: CacheService;

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async getProfile() {
    try {
      // Try to get from cache first
      const cachedProfile = await this.cacheService.get(CACHE_KEYS.USER_PROFILE);
      if (cachedProfile) return cachedProfile;

      // If not in cache, fetch from API
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/users/${user.id}`);
      if (!response.ok) throw new Error('Failed to load profile');

      const profile = await response.json();
      
      // Cache the profile
      await this.cacheService.set(CACHE_KEYS.USER_PROFILE, profile);
      
      return profile;
    } catch (error) {
      console.error('Error loading profile:', error);
      throw error;
    }
  }

  async updateProfile(updates: Partial<UserProfile>) {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update profile');

      const updatedProfile = await response.json();
      await this.cacheService.set(CACHE_KEYS.USER_PROFILE, updatedProfile);

      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  async clearCache() {
    await Promise.all([
      this.cacheService.remove(CACHE_KEYS.USER_PROFILE),
      this.cacheService.remove(CACHE_KEYS.USER_SETTINGS),
    ]);
  }

  async addPet(pet: { name: string; type: string }) {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: pet.name,
          type: pet.type,
        }),
      });

      if (!response.ok) throw new Error('Failed to add pet');

      const newPet = await response.json();
      if (!newPet || !newPet.name) {
        throw new Error('Invalid pet data received from server');
      }

      await this.cacheService.remove(CACHE_KEYS.USER_PROFILE);
      return newPet;
    } catch (error) {
      console.error('Error adding pet:', error);
      throw error;
    }
  }
} 