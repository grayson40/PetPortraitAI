import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Image, FlatList, Dimensions, Animated } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../../../services/auth';
import { getSupabase } from '../../../services/supabase';
import { theme } from '../../../styles/theme';
import { mockPhotos } from '../../../data/mockPhotos';
import { router } from 'expo-router';
import LoadingIndicator from '../../../components/LoadingIndicator';
import AddPetModal from '../../../components/AddPetModal';
import PetDetailsModal from '../../../components/PetDetailsModal';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = width / 4 - theme.spacing.sm * 2;

interface UserProfile {
  display_name?: string;
  phone?: string;
  pets?: { name: string; type: string }[];
}

interface Stats {
  totalPhotos: number;
  perfectShots: number;
  totalLikes: number;
  photosThisWeek: number;
}

export default function Profile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalPhotos: 0,
    perfectShots: 0,
    totalLikes: 0,
    photosThisWeek: 0,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isAddPetModalVisible, setIsAddPetModalVisible] = useState(false);
  const [selectedPet, setSelectedPet] = useState<{ name: string; type: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadUserProfile(), loadStats()]);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    };
    loadData();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (user?.user_metadata) {
        setUserProfile({
          display_name: user.user_metadata.display_name,
          phone: user.user_metadata.phone,
          pets: [
            { name: 'Max', type: 'Dog' },
            { name: 'Luna', type: 'Cat' },
          ],
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = () => {
    // Mock stats - would be fetched from backend
    setStats({
      totalPhotos: mockPhotos.length,
      perfectShots: Math.floor(mockPhotos.length * 0.8),
      totalLikes: mockPhotos.reduce((acc, photo) => acc + photo.likes, 0),
      photosThisWeek: 3,
    });
  };

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to log out');
      console.error(error);
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

  const handleAddPet = async (pet: { name: string; type: string }) => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (user) {
        const updatedPets = [...(userProfile?.pets || []), pet];
        const { error } = await getSupabase().auth.updateUser({
          data: {
            ...user.user_metadata,
            pets: updatedPets,
          },
        });

        if (error) throw error;

        setUserProfile(prev => ({
          ...prev!,
          pets: updatedPets,
        }));
      }
    } catch (error) {
      console.error('Error adding pet:', error);
      Alert.alert('Error', 'Failed to add pet');
    }
  };

  const handleDeletePet = async (petToDelete: { name: string; type: string }) => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (user) {
        const updatedPets = userProfile?.pets?.filter(
          p => p.name !== petToDelete.name || p.type !== petToDelete.type
        ) || [];
        
        const { error } = await getSupabase().auth.updateUser({
          data: {
            ...user.user_metadata,
            pets: updatedPets,
          },
        });

        if (error) throw error;

        setUserProfile(prev => ({
          ...prev!,
          pets: updatedPets,
        }));
        setSelectedPet(null);
      }
    } catch (error) {
      console.error('Error deleting pet:', error);
      Alert.alert('Error', 'Failed to delete pet');
    }
  };

  const StatBox = ({ icon, value, label }: { icon: string; value: number; label: string }) => (
    <View style={styles.statBox}>
      <MaterialIcons name={icon} size={24} color={theme.colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

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
    return <LoadingIndicator />;
  }

  return (
    <Animated.ScrollView 
      style={[styles.container, { opacity: fadeAnim }]}
    >
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="person" size={40} color={theme.colors.text.inverse} />
        </View>
        <Text style={styles.name}>{userProfile?.display_name || 'Pet Photographer'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <StatBox icon="photo-library" value={stats.totalPhotos} label="Total Photos" />
        <StatBox icon="thumb-up" value={stats.totalLikes} label="Total Likes" />
        <StatBox icon="star" value={stats.perfectShots} label="Perfect Shots" />
        <StatBox icon="trending-up" value={stats.photosThisWeek} label="This Week" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Pets</Text>
        <View style={styles.petsContainer}>
          {userProfile?.pets?.map((pet, index) => (
            <Pressable 
              key={index} 
              style={styles.petTag}
              onPress={() => setSelectedPet(pet)}
            >
              <MaterialIcons name="pets" size={16} color={theme.colors.primary} />
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petType}>({pet.type})</Text>
            </Pressable>
          ))}
          <Pressable 
            style={styles.addPetButton}
            onPress={() => setIsAddPetModalVisible(true)}
          >
            <MaterialIcons name="add" size={20} color={theme.colors.primary} />
            <Text style={styles.addPetText}>Add Pet</Text>
          </Pressable>
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.settingsContainer}>
          <Pressable 
            style={styles.settingButton}
            onPress={() => router.push('/(authenticated)/(tabs)/profile/edit')}
          >
            <MaterialIcons name="edit" size={24} color={theme.colors.primary} />
            <Text style={styles.settingText}>Edit Profile</Text>
          </Pressable>
          <Pressable style={styles.settingButton}>
            <MaterialIcons name="notifications" size={24} color={theme.colors.primary} />
            <Text style={styles.settingText}>Notifications</Text>
          </Pressable>
          <Pressable style={styles.settingButton}>
            <MaterialIcons name="privacy-tip" size={24} color={theme.colors.primary} />
            <Text style={styles.settingText}>Privacy Settings</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Pressable 
          style={styles.button}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Log Out</Text>
        </Pressable>

        <Pressable 
          style={[styles.button, styles.deleteButton]}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.buttonText}>Delete Account</Text>
        </Pressable>
      </View>

      <AddPetModal
        visible={isAddPetModalVisible}
        onClose={() => setIsAddPetModalVisible(false)}
        onAdd={handleAddPet}
      />

      {selectedPet && (
        <PetDetailsModal
          visible={!!selectedPet}
          onClose={() => setSelectedPet(null)}
          pet={selectedPet}
          onDelete={() => {
            Alert.alert(
              'Remove Pet',
              `Are you sure you want to remove ${selectedPet.name}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Remove',
                  style: 'destructive',
                  onPress: () => handleDeletePet(selectedPet),
                },
              ]
            );
          }}
        />
      )}
    </Animated.ScrollView>
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
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginVertical: theme.spacing.md,
  },
  statBox: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  section: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  petsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  petTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  petName: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  petType: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  addPetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  addPetText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
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
  settingsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  settingText: {
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
}); 