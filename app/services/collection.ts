import { getSupabase } from './supabase';
import { SoundService } from './sound';
import { API_CONFIG } from '../constants/config';

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
  // TODO: This does not work at all
  async setActiveCollection(id: string) {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('No user found');

    const response = await fetch(`${this.apiUrl}/${id}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id })
    });

    if (!response.ok) throw new Error('Failed to set active collection');
    const collection = await response.json();

    // Preload sounds for the active collection
    // TODO: Handle sound types
    await Promise.all(
      collection.collection_sounds.map(({ sound }: { sound: any }) =>
        this.soundService.loadSound({
          id: sound.id,
          name: sound.name,
          category: sound.category,
          uri: sound.url,
          isPremium: sound.isPremium,
        })
      )
    );

    return collection;
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
} 