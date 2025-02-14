import { Audio, AVPlaybackSource } from 'expo-av';
import { CacheService } from './cache';
import { getSupabase } from './supabase';
import { API_CONFIG } from '../constants/config';

interface SoundEffect {
  id: string;
  name: string;
  category: 'attention' | 'reward' | 'training';
  uri: string;
  isPremium: boolean;
}

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

interface SoundCollection {
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

  private constructor() {
    this.cacheService = CacheService.getInstance();
  }

  static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  async initialize() {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }

  async loadSound(effect: SoundEffect): Promise<void> {
    try {
      if (this.sounds.has(effect.id)) {
        return; // Sound already loaded
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: effect.uri } as AVPlaybackSource,
        { shouldPlay: false, volume: this.volume }
      );
      this.sounds.set(effect.id, sound);

      // Add event listener for playback status
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status && 'didJustFinish' in status && status.didJustFinish) {
          this.currentlyPlaying = null;
        }
      });
    } catch (error) {
      console.error('Error loading sound:', error);
      throw error;
    }
  }

  async playSound(effectId: string): Promise<void> {
    const sound = this.sounds.get(effectId);
    if (!sound) throw new Error(`Sound ${effectId} not loaded`);

    try {
      // Stop currently playing sound if any
      if (this.currentlyPlaying) {
        await this.currentlyPlaying.stopAsync();
      }

      await sound.setVolumeAsync(this.volume);
      await sound.setPositionAsync(0);
      await sound.playAsync();
      this.currentlyPlaying = sound;
      
      // Track effectiveness
      this.updateEffectivenessScore(effectId);
    } catch (error) {
      console.error('Error playing sound:', error);
      throw error;
    }
  }

  private updateEffectivenessScore(effectId: string) {
    const currentScore = this.effectivenessScores.get(effectId) || 0;
    this.effectivenessScores.set(effectId, currentScore + 1);
  }

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

  async cleanup(): Promise<void> {
    for (const sound of this.sounds.values()) {
      await sound.unloadAsync();
    }
    this.sounds.clear();
  }

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

  async setActiveCollection(collectionId: string): Promise<void> {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

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

  async clearCache(): Promise<void> {
    await Promise.all([
      this.cacheService.remove(CACHE_KEYS.DEFAULT_SOUNDS),
      this.cacheService.remove(CACHE_KEYS.USER_COLLECTIONS),
      this.cacheService.remove(CACHE_KEYS.MARKETPLACE_SOUNDS),
      this.cacheService.remove(CACHE_KEYS.USER_PURCHASED_SOUNDS),
    ]);
  }

  async getMarketplaceSounds(filter?: SoundFilter): Promise<Sound[]> {
    try {
      const cached = await this.cacheService.get<Sound[]>(CACHE_KEYS.MARKETPLACE_SOUNDS);
      if (cached && !filter) return cached;

      const queryParams = new URLSearchParams();
      if (filter?.category) queryParams.append('category', filter.category);
      if (filter?.isPremium !== undefined) queryParams.append('isPremium', String(filter.isPremium));
      if (filter?.query) queryParams.append('query', filter.query);
      if (filter?.sortBy) queryParams.append('sortBy', filter.sortBy);

      const response = await fetch(`${API_CONFIG.url}/sounds/marketplace?${queryParams}`);
      if (!response.ok) throw new Error('Failed to load marketplace sounds');

      const sounds = await response.json();
      if (!filter) {
        await this.cacheService.set(CACHE_KEYS.MARKETPLACE_SOUNDS, sounds);
      }

      return sounds;
    } catch (error) {
      console.error('Error loading marketplace sounds:', error);
      throw error;
    }
  }

  async purchaseSound(soundId: string): Promise<void> {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/sounds/marketplace/${soundId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) throw new Error('Failed to purchase sound');
      
      // Invalidate relevant caches
      await Promise.all([
        this.cacheService.remove(CACHE_KEYS.USER_PURCHASED_SOUNDS),
        this.cacheService.remove(CACHE_KEYS.MARKETPLACE_SOUNDS),
      ]);
    } catch (error) {
      console.error('Error purchasing sound:', error);
      throw error;
    }
  }

  async getUserPurchasedSounds(): Promise<Sound[]> {
    try {
      const cached = await this.cacheService.get<Sound[]>(CACHE_KEYS.USER_PURCHASED_SOUNDS);
      if (cached) return cached;

      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/users/${user.id}/purchased-sounds`);
      if (!response.ok) throw new Error('Failed to load purchased sounds');

      const sounds = await response.json();
      await this.cacheService.set(CACHE_KEYS.USER_PURCHASED_SOUNDS, sounds);

      return sounds;
    } catch (error) {
      console.error('Error loading purchased sounds:', error);
      throw error;
    }
  }

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
}

// export const soundService = SoundService.getInstance(); 