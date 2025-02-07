import { Audio } from 'expo-av';

interface SoundEffect {
  id: string;
  name: string;
  category: 'attention' | 'reward' | 'training';
  uri: string;
  isPremium: boolean;
}

class SoundService {
  private sounds: Map<string, Audio.Sound> = new Map();
  private volume: number = 0.8; // Default volume
  private effectivenessScores: Map<string, number> = new Map();
  private currentlyPlaying: Audio.Sound | null = null;

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
        effect.uri,
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
}

export const soundService = new SoundService(); 