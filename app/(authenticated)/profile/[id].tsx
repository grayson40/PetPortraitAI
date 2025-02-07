import { View, Text, StyleSheet, ScrollView, Image, FlatList, Dimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { getSupabase } from '../../services/supabase';
import { theme } from '../../styles/theme';
import { mockPhotos } from '../../data/mockPhotos';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = width / 4 - theme.spacing.sm * 2;

interface PublicProfile {
  id: string;
  display_name?: string;
  avatar_url?: string;
  pets?: { name: string; type: string }[];
}

interface Stats {
  totalPhotos: number;
  perfectShots: number;
  totalLikes: number;
}

export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalPhotos: 0,
    perfectShots: 0,
    totalLikes: 0,
  });

  useEffect(() => {
    loadProfile();
    loadStats();
  }, [id]);

  const loadProfile = async () => {
    try {
      // In a real app, fetch the user's public profile from Supabase
      // For now, using mock data
      setProfile({
        id,
        display_name: 'Pet Lover',
        pets: [
          { name: 'Max', type: 'Dog' },
          { name: 'Luna', type: 'Cat' },
        ],
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = () => {
    // Mock stats - would be fetched from backend
    const userPhotos = mockPhotos.slice(0, 5); // Pretend these are the user's photos
    setStats({
      totalPhotos: userPhotos.length,
      perfectShots: Math.floor(userPhotos.length * 0.8),
      totalLikes: userPhotos.reduce((acc, photo) => acc + photo.likes, 0),
    });
  };

  const renderPhoto = ({ item: photo }) => (
    <View style={styles.photoContainer}>
      <Image 
        source={{ uri: photo.imageUrl }} 
        style={styles.photo}
        resizeMode="cover"
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="person" size={40} color={theme.colors.text.inverse} />
        </View>
        <Text style={styles.name}>{profile?.display_name}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <MaterialIcons name="photo-library" size={24} color={theme.colors.primary} />
          <Text style={styles.statValue}>{stats.totalPhotos}</Text>
          <Text style={styles.statLabel}>Photos</Text>
        </View>
        <View style={styles.statBox}>
          <MaterialIcons name="thumb-up" size={24} color={theme.colors.primary} />
          <Text style={styles.statValue}>{stats.totalLikes}</Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
        <View style={styles.statBox}>
          <MaterialIcons name="star" size={24} color={theme.colors.primary} />
          <Text style={styles.statValue}>{stats.perfectShots}</Text>
          <Text style={styles.statLabel}>Perfect Shots</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pets</Text>
        <View style={styles.petsContainer}>
          {profile?.pets?.map((pet, index) => (
            <View key={index} style={styles.petTag}>
              <MaterialIcons name="pets" size={16} color={theme.colors.primary} />
              <Text style={styles.petName}>{pet.name}</Text>
              <Text style={styles.petType}>({pet.type})</Text>
            </View>
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
    </ScrollView>
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
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
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
}); 