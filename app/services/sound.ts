import { Audio, AVPlaybackSource } from 'expo-av';
import { CacheService } from './cache';
import { getSupabase } from './supabase';
import { API_CONFIG } from '../constants/config';
import { mockSounds } from '../data/mockSounds';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Sound {
  id: string;
  name: string;
  url: string;
  category: 'attention' | 'reward' | 'training' | 'custom';
  description: string;
  created_at: string;
  isPremium: boolean;
  price?: number;
  creator?: {
    id: string;
    display_name: string;
  };
  stats?: {
    downloads: number;
    rating: number;
    reviews_count: number;
  };
}

export interface SoundCollection {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  user_id: string;
  collection_sounds: Array<{
    sound_id: string;
    sound_type: 'default' | 'marketplace' | 'user';
    order_index: number;
    sound: Sound;
  }>;
}

interface SoundFilter {
  category?: string;
  isPremium?: boolean;
  query?: string;
  sortBy?: 'popular' | 'recent' | 'rating';
}

const CACHE_KEYS = {
  DEFAULT_SOUNDS: 'default_sounds',
  USER_COLLECTIONS: 'user_collections',
  MARKETPLACE_SOUNDS: 'marketplace_sounds',
  USER_PURCHASED_SOUNDS: 'user_purchased_sounds',
};

export class SoundService {
  private static instance: SoundService;
  private cacheService: CacheService;
  private sounds: Map<string, Audio.Sound> = new Map();
  private volume: number = 0.8; // Default volume
  private effectivenessScores: Map<string, number> = new Map();
  private currentlyPlaying: Audio.Sound | null = null;
  private supabase = getSupabase();
  private soundCache: Map<string, Sound> = new Map();
  private initialized: boolean = false;
  private cache: Map<string, any> = new Map();
  private soundInstance: Audio.Sound | null = null;
  private playbackStatus: any = null;
  private statusUpdateCallback: ((status: any) => void) | null = null;

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  /**
   * Get the instance of the SoundService
   * @returns The instance of the SoundService
   */
  static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  /**
   * Check if the SoundService is initialized
   * @returns True if the SoundService is initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize the SoundService
   */
  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Load user volume setting
      await this.syncVolumeFromSettings();

      // Load mock sounds on initialization
      await Promise.all(
        mockSounds.map(sound => this.loadSound({
          id: sound.id,
          name: sound.name,
          category: sound.category,
          uri: sound.uri,
          isPremium: sound.isPremium
        }))
      );
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing sound service:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Sync volume setting from user profile
   */
  async syncVolumeFromSettings() {
    try {
      const userProfileString = await AsyncStorage.getItem('user_profile');
      if (userProfileString) {
        const userProfile = JSON.parse(userProfileString);
        if (userProfile && userProfile.sound_volume !== undefined) {
          // Convert from percentage (0-100) to decimal (0-1)
          const volumeDecimal = Math.max(0, Math.min(1, userProfile.sound_volume / 100));
          this.setVolume(volumeDecimal);
        }
      }
    } catch (error) {
      console.error('Error loading volume from settings:', error);
      // Use default volume if there's an error
    }
  }

  /**
   * Load a sound
   * @param effect - The effect to load
   */
  async loadSound(effect: { 
    id: string; 
    uri: any; 
    name?: string; 
    category?: string; 
    isPremium?: boolean 
  }) {
    try {
      if (this.sounds.has(effect.id)) return;
      
      // Determine if we're dealing with a URL (string) or a local asset (object)
      const source = typeof effect.uri === 'string' 
        ? { uri: effect.uri }  // Web URL format
        : effect.uri;          // Local asset format
      
      const { sound } = await Audio.Sound.createAsync(
        source,
        { shouldPlay: false, volume: this.volume }
      );
      
      this.sounds.set(effect.id, sound);
    } catch (error) {
      console.error('Error loading sound:', error);
      throw error;
    }
  }

  /**
   * Play a sound
   * @param effectId - The effect to play
   */
  async playSound(effectId: string): Promise<void> {
    const sound = this.sounds.get(effectId);
    if (!sound) throw new Error(`Sound ${effectId} not loaded`);

    try {
      // Sync volume before playing
      await this.syncVolumeFromSettings();
      
      // Get current status to check if sound is loaded properly
      const status = await sound.getStatusAsync();
      
      // If sound is not loaded or has an error, don't try to play it
      if (status.isLoaded === false) {
        console.warn(`Sound ${effectId} is not properly loaded, cannot play`);
        return;
      }
      
      // Ensure sound has correct volume
      await sound.setVolumeAsync(this.volume);
      
      await sound.stopAsync(); // Stop first
      await sound.setPositionAsync(0); // Reset position
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
      // Don't throw error, as it might be due to network issues with remote audio
      // Instead, log it and continue
    }
  }

  /**
   * On playback status update
   * @param callback - The callback to call when the playback status is updated
   */
  onPlaybackStatusUpdate(callback: (status: any) => void) {
    const sound = Array.from(this.sounds.values())[0];
    if (sound) {
      sound.setOnPlaybackStatusUpdate(callback);
    }
  }

  /**
   * Update the effectiveness score
   * @param effectId - The effect to update the score for
   */
  private updateEffectivenessScore(effectId: string) {
    const currentScore = this.effectivenessScores.get(effectId) || 0;
    this.effectivenessScores.set(effectId, currentScore + 1);
  }

  /**
   * Get the effectiveness score
   * @param effectId - The effect to get the score for
   * @returns The effectiveness score
   */
  getEffectivenessScore(effectId: string): number {
    return this.effectivenessScores.get(effectId) || 0;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    // Update volume for all loaded sounds
    this.sounds.forEach(async (sound) => {
      await sound.setVolumeAsync(this.volume);
    });
  }

  /**
   * Cleanup the SoundService
   * @param unload - Whether to unload the sounds
   */
  async cleanup(unload = true) {
    try {
      // Stop playback but don't unload unless specified
      for (const [id, sound] of this.sounds) {
        await sound.stopAsync();
        if (unload) {
          await sound.unloadAsync();
          this.sounds.delete(id);
        }
      }
    } catch (error) {
      console.error('Error cleaning up sounds:', error);
    }
  }

  /**
   * Get the default sounds
   * @returns The default sounds
   */
  async getDefaultSounds(): Promise<Sound[]> {
    try {
      const cached = await this.cacheService.get<Sound[]>(CACHE_KEYS.DEFAULT_SOUNDS);
      if (cached) return cached;

      const response = await fetch(`${API_CONFIG.url}/sounds/default`);
      if (!response.ok) throw new Error('Failed to load default sounds');

      const sounds = await response.json();
      await this.cacheService.set(CACHE_KEYS.DEFAULT_SOUNDS, sounds);

      return sounds;
    } catch (error) {
      console.error('Error loading default sounds:', error);
      throw error;
    }
  }

  /**
   * Get the user collections
   * @returns The user collections
   */
  async getUserCollections(): Promise<SoundCollection[]> {
    try {
      const cached = await this.cacheService.get<SoundCollection[]>(CACHE_KEYS.USER_COLLECTIONS);
      if (cached) return cached;

      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return []; // Return empty array if no user

      const response = await fetch(`${API_CONFIG.url}/sounds/collections/${user.id}`);
      if (!response.ok) return []; // Return empty array on error

      const collections = await response.json();
      await this.cacheService.set(CACHE_KEYS.USER_COLLECTIONS, collections);
      return collections;
    } catch (error) {
      console.error('Error loading collections:', error);
      return []; // Return empty array on any error
    }
  }

  /**
   * Create a collection
   * @param name - The name of the collection
   * @param sounds - The sounds to add to the collection
   * @returns The created collection
   */
  async createCollection(name: string, sounds: Array<{ sound_id: string; sound_type: 'default' | 'marketplace' | 'user'; order_index: number }>) {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/sounds/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name,
          is_active: false,
          collection_sounds: sounds,
        }),
      });

      if (!response.ok) throw new Error('Failed to create collection');

      const newCollection = await response.json();
      await this.cacheService.remove(CACHE_KEYS.USER_COLLECTIONS);

      return newCollection;
    } catch (error) {
      console.error('Error creating collection:', error);
      throw error;
    }
  }

  /**
   * Set the active collection
   * @param collectionId - The id of the collection to activate
   */
  async setActiveCollection(collectionId: string): Promise<void> {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      // TODO: This endpoint does not exist yet
      const response = await fetch(`${API_CONFIG.url}/sounds/collections/${collectionId}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) throw new Error('Failed to activate collection');

      await this.cacheService.remove(CACHE_KEYS.USER_COLLECTIONS);
    } catch (error) {
      console.error('Error activating collection:', error);
      throw error;
    }
  }

  /**
   * Add sounds to a collection
   * @param collectionId - The id of the collection to add the sounds to
   * @param sounds - The sounds to add to the collection
   */
  async addSoundsToCollection(collectionId: string, sounds: Array<{ sound_id: string; sound_type: 'default' | 'marketplace' | 'user' }>) {
    try {
      const response = await fetch(`${API_CONFIG.url}/sounds/collections/${collectionId}/sounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sounds }),
      });

      if (!response.ok) throw new Error('Failed to add sounds to collection');

      await this.cacheService.remove(CACHE_KEYS.USER_COLLECTIONS);
    } catch (error) {
      console.error('Error adding sounds to collection:', error);
      throw error;
    }
  }

  /**
   * Remove sounds from a collection
   * @param collectionId - The id of the collection to remove the sounds from
   * @param soundIds - The ids of the sounds to remove from the collection
   */
  async removeSoundsFromCollection(collectionId: string, soundIds: string[]) {
    try {
      const response = await fetch(`${API_CONFIG.url}/sounds/collections/${collectionId}/sounds`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sound_ids: soundIds }),
      });

      if (!response.ok) throw new Error('Failed to remove sounds from collection');

      await this.cacheService.remove(CACHE_KEYS.USER_COLLECTIONS);
    } catch (error) {
      console.error('Error removing sounds from collection:', error);
      throw error;
    }
  }

  /**
   * Add a sound to the user's account
   * @param sound - The sound to add
   */
  async addSound(sound: Sound) {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/user-sounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: sound.name,
          category: sound.category,
          description: sound.description,
          is_premium: sound.isPremium,
          price: sound.price,
          creator_id: sound.creator?.id,
          creator_display_name: sound.creator?.display_name,
          stats: sound.stats,
        }),
      }); 

      if (!response.ok) throw new Error('Failed to add sound');

      return await response.json();
    } catch (error) {
      console.error('Error adding sound:', error);
      throw error;
    }
  }

  /**
   * Clear the cache
   * @returns The cache
   */
  async clearCache(): Promise<void> {
    this.soundCache.clear();
    this.initialized = false;
    await Promise.all([
      this.cacheService.remove(CACHE_KEYS.DEFAULT_SOUNDS),
      this.cacheService.remove(CACHE_KEYS.USER_COLLECTIONS),
      this.cacheService.remove(CACHE_KEYS.MARKETPLACE_SOUNDS),
      this.cacheService.remove(CACHE_KEYS.USER_PURCHASED_SOUNDS),
    ]);
  }

  /**
   * Unload all sounds
   */
  async unloadAll() {
    try {
      // Unload all sounds from memory
      for (const [id, sound] of this.sounds) {
        await sound.unloadAsync();
      }
      this.sounds.clear();
    } catch (error) {
      console.error('Error unloading sounds:', error);
    }
  }

  /**
   * Get the user's custom sounds
   * @returns The user's custom sounds
   */
  async getUserSounds(): Promise<Sound[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return []; // Return empty array if no user

      const response = await fetch(`${API_CONFIG.url}/user-sounds`, {
        headers: {
          'user-id': user.id
        }
      });
      
      if (!response.ok) return []; // Return empty array on error

      const sounds = await response.json();
      return sounds.map((sound: any) => ({
        id: sound.id,
        name: sound.name,
        category: sound.category,
        url: sound.url,
        uri: sound.url, // Add uri property for compatibility with player
        isPremium: sound.isPremium || false,
        created_at: sound.created_at,
        isUserSound: true // Flag to identify user-created sounds
      }));
    } catch (error) {
      console.error('Error loading user sounds:', error);
      return []; // Return empty array on any error
    }
  }

  /**
   * Delete a user sound
   * @param soundId - The id of the sound to delete
   */
  async deleteUserSound(soundId: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/user-sounds/${soundId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete sound');
      }

      return true;
    } catch (error) {
      console.error('Error deleting sound:', error);
      throw error;
    }
  }

  /**
   * Crop a user sound by adjusting start and end times
   * @param soundId - The id of the sound to crop
   * @param startTime - The new start time in milliseconds
   * @param endTime - The new end time in milliseconds
   * @returns The edited sound object
   */
  async cropUserSound(soundId: string, startTime: number, endTime: number): Promise<Sound> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Make API request to backend to crop the sound
      const response = await fetch(`${API_CONFIG.url}/user-sounds/${soundId}/crop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({
          startTime,
          endTime
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to crop sound');
      }

      // Get the server response with the updated sound details
      const updatedSound = await response.json();
      
      // Update cache if needed
      if (this.cache.has('userSounds')) {
        const userSounds = this.cache.get('userSounds');
        const updatedSounds = userSounds.map((sound: Sound) => 
          sound.id === soundId ? { ...sound, ...updatedSound } : sound
        );
        this.cache.set('userSounds', updatedSounds);
      }

      return updatedSound;
    } catch (error) {
      console.error('Error cropping user sound:', error);
      throw error;
    }
  }
}

export const soundService = SoundService.getInstance(); 