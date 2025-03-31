import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../styles/theme';
import { getSupabase } from '../../../services/supabase';
import { API_CONFIG } from '../../../constants/config';
import Slider from '@react-native-community/slider';
import SubscriptionModal from '../../../components/SubscriptionModal';
import { SoundService } from '../../../services/sound';
import Dropdown from '../../../components/Dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserSettings {
  sound_volume: number;
  subscription_tier: 'basic' | 'premium';
  caption_personality: 'funny' | 'formal' | 'short';
}

// Caption personality options
const CAPTION_PERSONALITIES = [
  { label: 'Funny', value: 'funny' },
  { label: 'Formal', value: 'formal' },
  { label: 'Short', value: 'short' },
  // { label: 'Custom', value: 'custom' },
];

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [volumeChanged, setVolumeChanged] = useState(false);
  const [currentVolume, setCurrentVolume] = useState<number>(0);
  const [selectedPersonality, setSelectedPersonality] = useState<string>('short');
  const [personalityChanged, setPersonalityChanged] = useState(false);

  useEffect(() => {
    loadSettings();

    // Subscribe to auth state changes
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'USER_UPDATED' && session?.user) {
        console.log('Auth state changed, reloading settings...');
        await loadSettings();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/users/${user.id}`);
      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();
      const volume = data.sound_volume || 100;
      const captionPersonality = data.caption_personality || 'short';
      
      setSettings({
        sound_volume: volume,
        subscription_tier: data.subscription_tier || 'basic',
        caption_personality: captionPersonality,
      });
      setCurrentVolume(volume);
      setSelectedPersonality(captionPersonality);
      setVolumeChanged(false);
      setPersonalityChanged(false);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    }
  };

  const handleVolumeChange = (value: number) => {
    // Only update local state
    setCurrentVolume(value);
    // Mark as changed if different from saved value
    if (value !== settings?.sound_volume) {
      setVolumeChanged(true);
    } else {
      setVolumeChanged(false);
    }
  };

  const handlePersonalityChange = (value: string) => {
    setSelectedPersonality(value);
    if (value !== settings?.caption_personality) {
      setPersonalityChanged(true);
    } else {
      setPersonalityChanged(false);
    }
  };

  const saveVolumeSettings = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/users/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          sound_volume: Math.round(currentVolume) 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Volume update error:', errorData);
        throw new Error(errorData.message || 'Failed to update volume');
      }

      // Update saved settings
      const updatedVolume = Math.round(currentVolume);
      setSettings(prev => prev ? { ...prev, sound_volume: updatedVolume } : null);
      setVolumeChanged(false);
      
      // Update sound service volume
      const soundService = SoundService.getInstance();
      soundService.setVolume(updatedVolume / 100); // Convert to decimal for sound service
      
      Alert.alert('Success', 'Volume settings saved');
    } catch (error) {
      console.error('Error updating volume:', error);
      Alert.alert('Error', 'Failed to save volume settings');
    } finally {
      setLoading(false);
    }
  };

  const savePersonalitySettings = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session?.user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/users/${session.user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          caption_personality: selectedPersonality 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Personality update error:', errorData);
        throw new Error(errorData.message || 'Failed to update personality');
      }

      // Update saved settings
      setSettings(prev => prev ? { ...prev, caption_personality: selectedPersonality as any } : null);
      setPersonalityChanged(false);

      // Update AsyncStorage
      const userProfile = await AsyncStorage.getItem('user_profile');
      const userProfileJson = userProfile ? JSON.parse(userProfile) : null;
      await AsyncStorage.setItem('user_profile', JSON.stringify({
        ...userProfileJson,
        caption_personality: selectedPersonality
      }));
      
      Alert.alert('Success', 'Caption personality saved');
    } catch (error) {
      console.error('Error updating personality:', error);
      Alert.alert('Error', 'Failed to save personality settings');
    } finally {
      setLoading(false);
    }
  };

  const PREMIUM_FEATURES = [
    { id: '1', text: 'Access to premium sounds', icon: 'music-note' as const },
    { id: '2', text: 'Unlimited sound collections', icon: 'library-music' as const },
    { id: '3', text: 'Advanced pet detection', icon: 'pets' as const },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Sound Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sound Settings</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <MaterialIcons name="volume-up" size={24} color={theme.colors.text.primary} />
            <Text style={styles.settingLabel}>Sound Volume</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={currentVolume || settings?.sound_volume || 80}
            onValueChange={handleVolumeChange}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
          />
          <View style={styles.volumeContainer}>
            <Text style={styles.volumeText}>{Math.round(currentVolume || settings?.sound_volume || 80)}%</Text>
            {volumeChanged && (
              <Pressable 
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={saveVolumeSettings}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Caption Generator Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Caption Generator</Text>
          <View style={styles.selectedPersonalityBadge}>
            <MaterialIcons 
              name={
                selectedPersonality === 'funny' ? 'mood' : 
                selectedPersonality === 'formal' ? 'business' : 
                'short-text'
              } 
              size={16} 
              color={theme.colors.text.inverse} 
            />
            <Text style={styles.selectedPersonalityText}>
              {CAPTION_PERSONALITIES.find(p => p.value === selectedPersonality)?.label || 'Short'}
            </Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingHeader}>
            <MaterialIcons name="chat-bubble-outline" size={24} color={theme.colors.text.primary} />
            <Text style={styles.settingLabel}>Caption Personality</Text>
          </View>
          
          <View style={styles.dropdownContainer}>
            <Dropdown
              data={CAPTION_PERSONALITIES}
              value={selectedPersonality}
              onChange={handlePersonalityChange}
              placeholder="Select personality"
            />
            
            {selectedPersonality === 'funny' && (
              <Text style={styles.personalityDescription}>
                Generates humorous, playful captions for your pet photos.
              </Text>
            )}
            {selectedPersonality === 'formal' && (
              <Text style={styles.personalityDescription}>
                Creates professional, well-structured captions with proper grammar.
              </Text>
            )}
            {selectedPersonality === 'short' && (
              <Text style={styles.personalityDescription}>
                Produces brief, concise captions that get straight to the point.
              </Text>
            )}
          </View>
          
          {personalityChanged && (
            <View style={styles.volumeContainer}>
              <View style={{flex: 1}} />
              <Pressable 
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={savePersonalitySettings}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.text.inverse} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Subscription Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <MaterialIcons 
              name={settings?.subscription_tier === 'premium' ? 'star' : 'star-border'} 
              size={24} 
              color={theme.colors.primary} 
            />
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionTier}>
                {settings?.subscription_tier || 'basic'} Plan
              </Text>
            </View>
          </View>

          {/* TODO: Premium implementation for future release
          {settings?.subscription_tier === 'basic' && (
            <Pressable 
              style={styles.upgradeButton}
              onPress={() => setIsSubscriptionModalVisible(true)}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </Pressable>
          )} */}
        </View>

        {/* Premium Features List */}
        <View style={styles.featuresList}>
          <Text style={styles.featuresTitle}>Premium Features</Text>
          {PREMIUM_FEATURES.map(feature => (
            <View key={feature.id} style={styles.featureItem}>
              <MaterialIcons 
                name={feature.icon} 
                size={20} 
                color={theme.colors.primary} 
              />
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <SubscriptionModal
        visible={isSubscriptionModalVisible}
        onClose={() => setIsSubscriptionModalVisible(false)}
        currentTier={settings?.subscription_tier || 'basic'}
        loading={upgrading}
        loadSettings={loadSettings}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  section: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  settingItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  settingLabel: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  volumeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  volumeText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
    fontSize: theme.typography.caption.fontSize,
  },
  dropdownContainer: {
    marginBottom: theme.spacing.md,
  },
  personalityDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  subscriptionCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTier: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
    textTransform: 'capitalize',
  },
  upgradeButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  upgradeButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  featuresList: {
    padding: theme.spacing.md,
  },
  featuresTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  featureText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  selectedPersonalityBadge: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    gap: 4,
  },
  selectedPersonalityText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
  personalityCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  personalityCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  selectedPersonalityCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: `${theme.colors.primary}10`,
  },
  personalityCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  selectedPersonalityCardTitle: {
    color: theme.colors.primary,
  },
  personalityCardDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  personalityCardCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  saveButtonFullWidth: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
  },
});