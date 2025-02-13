import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Image, FlatList, Dimensions, Animated, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../../../services/auth';
import { getSupabase } from '../../../services/supabase';
import { theme } from '../../../styles/theme';
import { mockPhotos } from '../../../data/mockPhotos';
import { router, useRouter } from 'expo-router';
import LoadingIndicator from '../../../components/LoadingIndicator';
import AddPetModal from '../../../components/AddPetModal';
import PetDetailsModal from '../../../components/PetDetailsModal';
import { API_CONFIG } from '../../../constants/config';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = width / 4 - theme.spacing.sm * 2;

interface Pet {
  id: string;
  name: string;
  type: string;
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
}

interface SoundCollection {
  id: string;
  name: string;
  sounds: Sound[];
  is_active: boolean;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isAddPetModalVisible, setIsAddPetModalVisible] = useState(false);
  const [isPetDetailsModalVisible, setIsPetDetailsModalVisible] = useState(false);
  const router = useRouter();
  const [soundCollections, setSoundCollections] = useState<SoundCollection[]>([]);
  const [soundVolume, setSoundVolume] = useState(80);
  const [isUpgradeModalVisible, setIsUpgradeModalVisible] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadProfile(), loadSoundSettings()]);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };
    loadData();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/users/${user.id}`);
      if (!response.ok) throw new Error('Failed to load profile');

      const data = await response.json();
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSoundSettings = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/users/${user.id}/settings`);
      const data = await response.json();
      
      setSoundVolume(data.sound_volume);
    } catch (error) {
      console.error('Error loading sound settings:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await getSupabase().auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.deleteAccount();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const handleAddPet = async (newPet: Pet) => {
    try {
      if (!newPet || !newPet.name) {
        throw new Error('Invalid pet data');
      }

      setProfile(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          pets: [...(prev.pets || []), newPet],
        };
      });

      setIsAddPetModalVisible(false);
      Alert.alert('Success', `${newPet.name} has been added to your pets!`);
    } catch (error) {
      console.error('Error adding pet:', error);
      Alert.alert('Error', 'Failed to add pet');
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
      pathname: '/(authenticated)/(tabs)/profile/edit-pet',
      params: { 
        petId: pet.id,
        petName: pet.name,
        petType: pet.type
      }
    });
  };

  const handleApiCall = async () => {
    const response = await fetch(`${API_CONFIG.url}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'graysoncrozier40@gmail.com',
        id: 'b7cb3136-813c-4fb0-8724-87b8417f8aef',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create user');
    }

    const data = await response.json();
    console.log(data);
  }

  const handlePetPress = (pet: Pet) => {
    if (!pet?.id) return;
    setSelectedPet(pet);
    setIsPetDetailsModalVisible(true);
  };

  const renderPhoto = ({ item: photo }) => (
    <Pressable 
      style={styles.photoContainer}
      onPress={() => router.push(`/(authenticated)/photo/${photo.id}`)}
    >
      <Image 
        source={{ uri: photo.imageUrl }} 
        style={styles.photo}
        resizeMode="cover"
      />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadProfile();
            }}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={40} color={theme.colors.text.inverse} />
          </View>
          <Text style={styles.name}>{profile?.display_name || 'User'}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <Pressable 
              key="edit-profile"
              style={styles.actionButton}
              onPress={() => router.push('/(authenticated)/(tabs)/profile/edit')}
            >
              <MaterialIcons name="edit" size={24} color={theme.colors.primary} />
              <Text style={styles.actionText}>Edit Profile</Text>
            </Pressable>

            <Pressable 
              key="settings"
              style={styles.actionButton}
              onPress={() => router.push('/(authenticated)/(tabs)/profile/settings')}
            >
              <MaterialIcons name="settings" size={24} color={theme.colors.primary} />
              <Text style={styles.actionText}>Settings</Text>
            </Pressable>

            {profile?.subscription_tier === 'basic' && (
              <Pressable 
                key="upgrade"
                style={styles.actionButton}
                onPress={() => setIsUpgradeModalVisible(true)}
              >
                <MaterialIcons name="star" size={24} color={theme.colors.primary} />
                <Text style={styles.actionText}>Upgrade to Pro</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Pets</Text>
            <Pressable 
              style={styles.addButton}
              onPress={() => setIsAddPetModalVisible(true)}
            >
              <View style={styles.addButtonInner}>
                <MaterialIcons name="add" size={20} color={theme.colors.text.inverse} />
                <Text style={styles.addButtonText}>Add Pet</Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.petsContainer}>
            {profile?.pets?.map((pet) => (
              <Pressable
                key={`pet-${pet.id}`}
                style={styles.petTag}
                onPress={() => handlePetPress(pet)}
              >
                <MaterialIcons name="pets" size={20} color={theme.colors.primary} />
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petType}>({pet.type})</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Photos</Text>
          <FlatList
            data={mockPhotos.slice(0, 8)}
            renderItem={renderPhoto}
            keyExtractor={item => item.id}
            numColumns={4}
            scrollEnabled={false}
            contentContainerStyle={styles.photosGrid}
          />
        </View>

        {profile?.active_collection && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Collection</Text>
            <View style={styles.collectionCard}>
              <MaterialIcons name="play-circle-filled" size={24} color={theme.colors.primary} />
              <View style={styles.collectionInfo}>
                <Text style={styles.collectionName}>{profile.active_collection.name}</Text>
                <Text style={styles.soundCount}>{profile.active_collection.sounds_count} sounds</Text>
              </View>
            </View>
          </View>
        )}

        {profile?.subscription_tier === 'basic' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Features</Text>
            <View style={styles.upgradeFeatures}>
              {[
                'Unlimited sound collections',
                'Access to premium sounds',
                'Advanced pet detection'
              ].map((feature, index) => (
                <View key={`feature-${index}`} style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={24} color={theme.colors.success} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.accountActions}>
            <Pressable style={styles.accountButton} onPress={handleSignOut}>
              <MaterialIcons name="logout" size={24} color={theme.colors.text.secondary} />
              <Text style={styles.accountButtonText}>Sign Out</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.button, styles.deleteButton]}
            onPress={handleDeleteAccount}
          >
            <Text style={styles.buttonText}>Delete Account</Text>
          </Pressable>
        </View>
      </ScrollView>

      <AddPetModal
        visible={isAddPetModalVisible}
        onClose={() => setIsAddPetModalVisible(false)}
        onAdd={handleAddPet}
      />

      <PetDetailsModal
        visible={isPetDetailsModalVisible}
        onClose={() => {
          setIsPetDetailsModalVisible(false);
          setTimeout(() => {
            setSelectedPet(null);
          }, 300);
        }}
        pet={selectedPet}
        onDelete={() => selectedPet && handleDeletePet(selectedPet.id)}
        onEdit={() => selectedPet && handleEditPet(selectedPet)}
      />

      <Modal
        visible={isUpgradeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsUpgradeModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setIsUpgradeModalVisible(false)}
        >
          <View style={styles.upgradeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upgrade to Pro</Text>
              <Pressable onPress={() => setIsUpgradeModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <View style={styles.upgradeFeatures}>
              <View style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={24} color={theme.colors.success} />
                <Text style={styles.featureText}>Unlimited sound collections</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={24} color={theme.colors.success} />
                <Text style={styles.featureText}>Access to premium sounds</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialIcons name="check-circle" size={24} color={theme.colors.success} />
                <Text style={styles.featureText}>Advanced pet detection</Text>
              </View>
            </View>

            <Pressable 
              style={styles.upgradeButton}
              onPress={() => {
                setIsUpgradeModalVisible(false);
                router.push('/(authenticated)/(tabs)/profile/subscription');
              }}
            >
              <Text style={styles.upgradeButtonText}>Continue to Pro</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  name: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  email: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  actionText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  petsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  petTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
  },
  petName: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  petType: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  photosGrid: {
    gap: theme.spacing.sm,
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
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  soundCount: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  accountActions: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  accountButtonText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  buttonContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  addButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  addButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  upgradeModal: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
  },
  upgradeFeatures: {
    gap: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  featureText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  upgradeButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
}); 