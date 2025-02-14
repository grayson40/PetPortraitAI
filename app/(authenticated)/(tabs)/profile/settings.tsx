import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { theme } from '../../../styles/theme';
import { getSupabase } from '../../../services/supabase';
import { API_CONFIG } from '../../../constants/config';
import Slider from '@react-native-community/slider';
import SubscriptionModal from '../../../components/SubscriptionModal';

interface UserSettings {
  sound_volume: number;
  subscription_tier: 'basic' | 'premium';
}

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/users/${user.id}`);
      if (!response.ok) throw new Error('Failed to load settings');

      const data = await response.json();
      setSettings({
        sound_volume: data.sound_volume || 80,
        subscription_tier: data.subscription_tier || 'basic',
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    }
  };

  const handleVolumeChange = async (value: number) => {
    try {
      setLoading(true);
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      // Update local state immediately for better UX
      setSettings(prev => prev ? { ...prev, sound_volume: value } : null);

      // Debounce the API call
      if (loading) return;

      const response = await fetch(`${API_CONFIG.url}/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sound_volume: Math.round(value) 
        }),
      });

      if (!response.ok) {
        // Revert on error
        setSettings(prev => prev ? { ...prev, sound_volume: prev.sound_volume } : null);
        throw new Error('Failed to update volume');
      }
    } catch (error) {
      console.error('Error updating volume:', error);
      // Don't show alert for every update attempt
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
            value={settings?.sound_volume || 80}
            onValueChange={handleVolumeChange}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
          />
          <Text style={styles.volumeText}>{Math.round(settings?.sound_volume || 80)}%</Text>
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

          {settings?.subscription_tier === 'basic' && (
            <Pressable 
              style={styles.upgradeButton}
              onPress={() => setIsSubscriptionModalVisible(true)}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
            </Pressable>
          )}
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
  volumeText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    textAlign: 'center',
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
});