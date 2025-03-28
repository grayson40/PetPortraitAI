import { getSupabase } from './supabase';
import { SoundService } from './sound';
import { API_CONFIG } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class CollectionService {
  private static instance: CollectionService;
  private soundService: SoundService;
  private apiUrl = `${API_CONFIG.url}/sounds/collections`;

  private constructor() {
    this.soundService = SoundService.getInstance();
  }

  /**
   * Get the instance of the CollectionService
   * @returns The instance of the CollectionService
   */
  static getInstance(): CollectionService {
    if (!CollectionService.instance) {
      CollectionService.instance = new CollectionService();
    }
    return CollectionService.instance;
  }

  /**
   * Create a collection
   * @param name - The name of the collection
   * @param sounds - The sounds to add to the collection
   * @returns The created collection
   */
  async createCollection(name: string, sounds: Array<{ sound_id: string; order_index: number }>) {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('No user found');

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        name,
        sounds: sounds.map(s => ({
          ...s,
          sound_type: 'default'
        }))
      })
    });

    if (!response.ok) throw new Error('Failed to create collection');
    return await response.json();
  }

  /**
   * Get a collection by id
   * @param id - The id of the collection
   * @returns The collection
   */
  async getCollection(id: string) {
    const response = await fetch(`${this.apiUrl}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch collection');
    return await response.json();
  }

  /**
   * Get the user's collections
   * @returns The user's collections
   */
  async getUserCollections() {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('No user found');

    const response = await fetch(`${this.apiUrl}/${user.id}`);
    console.log(response);
    if (!response.ok) throw new Error('Failed to fetch collections');
    return await response.json();
  }

  /**
   * Set the active collection
   * @param id - The id of the collection
   * @returns The updated collection
   */
  async setActiveCollection(collectionId: string) {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const response = await fetch(`${API_CONFIG.url}/sounds/collections/${collectionId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to set active collection');
      }

      // Get the collection sounds immediately after activation
      const soundsResponse = await this.getCollectionSounds(collectionId);
      
      // Store in AsyncStorage for persistence
      await AsyncStorage.setItem('selectedCollectionSounds', JSON.stringify(soundsResponse));
      await AsyncStorage.setItem('activeCollectionId', collectionId);

      return soundsResponse;
    } catch (error) {
      console.error('Error setting active collection:', error);
      throw error;
    }
  }

  /**
   * Add sounds to a collection
   * @param id - The id of the collection
   * @param sounds - The sounds to add to the collection
   * @returns The updated collection
   */
  async addSoundsToCollection(collectionId: string, sounds: Array<{ sound_id: string; order_index: number }>) {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const response = await fetch(`${this.apiUrl}/${collectionId}/sounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sounds })
    });

    if (!response.ok) {
      throw new Error('Failed to add sounds to collection');
    }
  }

  /**
   * Delete a collection
   * @param id - The id of the collection
   */
  async deleteCollection(id: string) {
    const response = await fetch(`${this.apiUrl}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete collection');
  }

  /**
   * Reset the active collection
   */
  // TODO: This does not work at all
  async resetActiveCollection(): Promise<void> {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) return;

    const response = await fetch(`${this.apiUrl}/reset-active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id })
    });

    if (!response.ok) throw new Error('Failed to reset active collection');
  }

  async removeSoundFromCollection(collectionId: string, soundId: string) {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const response = await fetch(`${this.apiUrl}/${collectionId}/sounds/${soundId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to remove sound from collection');
    }
  }

  async reorderSounds(collectionId: string, fromIndex: number, toIndex: number) {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const response = await fetch(`${this.apiUrl}/${collectionId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromIndex, toIndex })
    });

    if (!response.ok) {
      throw new Error('Failed to reorder sounds');
    }
  }

  async getCollectionSounds(collectionId: string) {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const response = await fetch(`${API_CONFIG.url}/sounds/collections/${collectionId}/sounds`);
    if (!response.ok) {
      throw new Error('Failed to fetch collection sounds');
    }

    const data = await response.json();
    
    // Transform the collection sounds into the expected format
    return data.map((cs: any) => ({
      id: cs.sound.id,
      name: cs.sound.name,
      category: cs.sound.category || 'default',
      uri: cs.sound.url?.replace('freesound.org', 'cdn.freesound.org/sounds'),
      isPremium: cs.sound.isPremium || false,
      order_index: cs.order_index
    }));
  }
} 