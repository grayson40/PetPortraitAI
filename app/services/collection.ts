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

  static getInstance(): CollectionService {
    if (!CollectionService.instance) {
      CollectionService.instance = new CollectionService();
    }
    return CollectionService.instance;
  }

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

  async getCollection(id: string) {
    const response = await fetch(`${this.apiUrl}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch collection');
    return await response.json();
  }

  async getUserCollections() {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) throw new Error('No user found');

    const response = await fetch(`${this.apiUrl}/${user.id}`);
    console.log(response);
    if (!response.ok) throw new Error('Failed to fetch collections');
    return await response.json();
  }

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

  async addSoundsToCollection(id: string, sounds: string[]) {
    const response = await fetch(`${this.apiUrl}/${id}/sounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sounds: sounds.map((soundId, index) => ({
          sound_id: soundId,
          sound_type: 'default', // or determine based on sound
          order_index: index
        }))
      })
    });

    if (!response.ok) throw new Error('Failed to add sounds');
    return await response.json();
  }

  async deleteCollection(id: string) {
    const response = await fetch(`${this.apiUrl}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete collection');
  }

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
} 