import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Image, Dimensions, Animated, RefreshControl, StatusBar, Platform } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { getSupabase } from '../../../services/supabase';
import { theme } from '../../../styles/theme';
import { useRouter } from 'expo-router';
import LoadingIndicator from '../../../components/LoadingIndicator';
import AddPetModal from '../../../components/AddPetModal';
import PetDetailsModal from '../../../components/PetDetailsModal';
import { API_CONFIG } from '../../../constants/config';
import { UserService } from '../../../services/user';
import { useAuth } from '../../../context/auth';
import SubscriptionModal from '../../../components/SubscriptionModal';
const { width } = Dimensions.get('window');
const PHOTO_SIZE = width / 4 - theme.spacing.sm * 2;

interface Pet {
  id: string;
  name: string;
  type: string;
}

interface Sound {
  id: string;
  name: string;
  url?: string;
  category: string;
  isPremium: boolean;
}

interface UserProfile {
  display_name: string;
  email: string;
  subscription_tier: 'basic' | 'premium';
  created_at: string;
  pets: Pet[];
  active_collection?: {
    id: string;
    name: string;
    sounds_count: number;
  };
  sound_volume: number;
  caption_personality?: 'funny' | 'formal' | 'short' | 'custom';
}

interface SoundCollection {
  id: string;
  name: string;
  sounds: Sound[];
  is_active: boolean;
}

export default function Profile() {
  const { signOut, deleteAccount } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isAddPetModalVisible, setIsAddPetModalVisible] = useState(false);
  const [isPetDetailsModalVisible, setIsPetDetailsModalVisible] = useState(false);
  const router = useRouter();
  const [soundCollections, setSoundCollections] = useState<SoundCollection[]>([]);
  const [soundVolume, setSoundVolume] = useState(80);
  const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setInitialLoading(true);

      const userService = UserService.getInstance();
      await userService.refreshProfile();
      const freshProfile = await userService.getUserProfile();
      
      setProfile(freshProfile);
      setSoundVolume(freshProfile.sound_volume);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData(true); // Pass true for initial load

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(async (event, session) => {
      if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
        await loadData(false); // Pass false for auth updates
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData(false); // Pass false for pull-to-refresh
    } catch (error) {
      console.error('Error refreshing:', error);
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              setInitialLoading(true);
              const { data: { user } } = await getSupabase().auth.getUser();
              if (!user) throw new Error('No user found');

              // Delete user profile from your API
              const response = await fetch(`${API_CONFIG.url}/users/${user.id}`, {
                method: 'DELETE',
              });

              if (!response.ok) {
                throw new Error('Failed to delete user profile');
              }

              // Sign out and delete Supabase user
              await getSupabase().auth.signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            } finally {
              setInitialLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAddPet = async (petData: { name: string; type: string }) => {
    try {
      const userService = UserService.getInstance();
      const newPet = await userService.addPet(petData);
      
      // Update local state with new pet
      setProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          pets: [...prev.pets, newPet],
        };
      });

      Alert.alert('Success', `${petData.name} has been added to your pets!`);
    } catch (error) {
      console.error('Error adding pet:', error);
      Alert.alert('Error', 'Failed to add pet');
      throw error; // Re-throw to prevent modal from closing
    }
  };

  const handleDeletePet = async (petId: string) => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/pets/${petId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete pet');
      }

      // Update local state
      setProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          pets: prev.pets.filter(p => p.id !== petId),
        };
      });

      setIsPetDetailsModalVisible(false);
      setSelectedPet(null);
      Alert.alert('Success', 'Pet removed successfully');
    } catch (error) {
      console.error('Error deleting pet:', error);
      Alert.alert('Error', 'Failed to delete pet');
    }
  };

  const handleEditPet = async (pet: Pet) => {
    if (!pet?.id) {
      console.error('No pet ID provided for edit');
      return;
    }

    setIsPetDetailsModalVisible(false);
    setSelectedPet(null);
    
    router.push({
      pathname: '/(authenticated)/(tabs)/profile/edit',
      params: { 
        petId: pet.id,
        petName: pet.name,
        petType: pet.type
      }
    });
  };

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      // Handle your upgrade logic here
      // For example:
      // await subscriptionService.upgrade();
      // await loadData();  // Refresh profile data
    } catch (error) {
      console.error('Error upgrading:', error);
      throw error;
    } finally {
      setUpgrading(false);
    }
  };

  if (initialLoading) {
    return <LoadingIndicator message="Loading profile..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh} 
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={40} color={theme.colors.text.inverse} />
          </View>
          <Text style={styles.name}>{profile?.display_name || 'User'}</Text>
          <Text style={styles.email}>{profile?.email || 'email@email.com'}</Text>
          
          {/* Caption Personality Badge */}
          <Pressable 
            style={styles.captionPersonalityBadge}
            onPress={() => router.push('/(authenticated)/(tabs)/profile/settings')}
          >
            <MaterialIcons 
              name={
                profile?.caption_personality === 'funny' ? 'mood' : 
                profile?.caption_personality === 'formal' ? 'business' : 
                'short-text'
              } 
              size={16} 
              color={theme.colors.text.inverse} 
            />
            <Text style={styles.captionPersonalityText}>
              {profile?.caption_personality === 'funny' ? 'Funny' : 
               profile?.caption_personality === 'formal' ? 'Formal' : 
               'Short'} Captions
            </Text>
            <MaterialIcons name="settings" size={14} color={theme.colors.text.inverse} />
          </Pressable>
          
          <View style={styles.actionButtons}>
            <Pressable 
              style={styles.actionButton}
              onPress={() => router.push('/(authenticated)/(tabs)/profile/edit')}
            >
              <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </Pressable>
            
            <Pressable 
              style={styles.actionButton}
              onPress={() => router.push('/(authenticated)/(tabs)/profile/settings')}
            >
              <MaterialIcons name="settings" size={20} color={theme.colors.primary} />
              <Text style={styles.actionButtonText}>Settings</Text>
            </Pressable>
          </View>
        </View>

        {/* Subscription Card */}
        <Pressable 
          style={styles.subscriptionCard}
          // TODO: Premium implementation for future release
          // onPress={() => setIsSubscriptionModalVisible(true)}
          onPress={() => Alert.alert('Coming Soon', 'Premium features will be available in a future update.')}
        >
          <View style={styles.subscriptionContent}>
            <MaterialIcons 
              name={profile?.subscription_tier === 'premium' ? 'star' : 'star-border'} 
              size={24} 
              color={theme.colors.primary} 
            />
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionTier}>
                {profile?.subscription_tier === 'premium' ? 'Premium' : 'Basic'} Plan
              </Text>
              {profile?.subscription_tier !== 'premium' && (
                <Text style={styles.upgradeText}>Upgrade for more features</Text>
              )}
            </View>
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.text.secondary} />
          </View>
        </Pressable>

        {/* Pets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Pets</Text>
            <Pressable 
              style={styles.addButton}
              onPress={() => setIsAddPetModalVisible(true)}
            >
              <MaterialIcons name="add" size={20} color={theme.colors.text.inverse} />
              <Text style={styles.addButtonText}>Add Pet</Text>
            </Pressable>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.petsScroll}
          >
            {profile?.pets.map(pet => (
              <Pressable 
                key={pet.id}
                style={styles.petCard}
                onPress={() => {
                  setSelectedPet(pet);
                  setIsPetDetailsModalVisible(true);
                }}
              >
                <View style={styles.petIcon}>
                  <MaterialIcons name="pets" size={24} color={theme.colors.text.inverse} />
                </View>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petType}>{pet.type}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.accountActions}>
            <Pressable 
              style={styles.accountButton}
              onPress={handleSignOut}
            >
              <MaterialIcons name="logout" size={24} color={theme.colors.error} />
              <Text style={[styles.accountButtonText, { color: theme.colors.error }]}>
                Sign Out
              </Text>
            </Pressable>

            <View style={styles.accountDivider} />

            <Pressable 
              style={styles.accountButton}
              onPress={handleDeleteAccount}
            >
              <MaterialIcons name="delete-forever" size={24} color={theme.colors.error} />
              <Text style={[styles.accountButtonText, { color: theme.colors.error }]}>
                Delete Account
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <AddPetModal 
        visible={isAddPetModalVisible}
        onClose={() => setIsAddPetModalVisible(false)}
        onAdd={handleAddPet}
      />
      
      <PetDetailsModal
        visible={isPetDetailsModalVisible}
        pet={selectedPet}
        onClose={() => {
          setIsPetDetailsModalVisible(false);
          setSelectedPet(null);
        }}
        onDelete={handleDeletePet}
        onEdit={handleEditPet}
      />

      <SubscriptionModal
        visible={isSubscriptionModalVisible}
        onClose={() => setIsSubscriptionModalVisible(false)}
        currentTier={profile?.subscription_tier || 'basic'}
        loading={upgrading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  petsScroll: {
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  petCard: {
    width: 120,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginRight: theme.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  petIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  petType: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  subscriptionCard: {
    margin: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subscriptionContent: {
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTier: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  upgradeText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  addButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  accountActions: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  accountButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  accountDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photosGrid: {
    gap: theme.spacing.sm,
  },
  captionPersonalityBadge: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: 4,
  },
  captionPersonalityText: {
    color: theme.colors.text.inverse,
    fontSize: 12,
    fontWeight: '600',
  },
}); 