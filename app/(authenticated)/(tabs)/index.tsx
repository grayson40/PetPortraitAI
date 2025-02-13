import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator, ActionSheetIOS, Platform, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { getSupabase } from '../../services/supabase';
import { API_CONFIG } from '../../constants/config';
import * as Haptics from 'expo-haptics';
import CreateCollectionModal from '../../components/CreateCollectionModal';
import AddSoundsModal from '../../components/AddSoundsModal';

interface Sound {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  created_at: string;
}

interface SoundCollection {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  user_id: string;
  collection_sounds: Array<{
    sound_id: string;
    sound_type: 'default' | 'marketplace' | 'user';
    order_index: number;
    sound: Sound;
  }>;
}

export default function SoundManagement() {
  const [collections, setCollections] = useState<SoundCollection[]>([]);
  const [defaultSounds, setDefaultSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isAddSoundsVisible, setIsAddSoundsVisible] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const [defaultRes, collectionsRes] = await Promise.all([
        fetch(`${API_CONFIG.url}/sounds/default`),
        fetch(`${API_CONFIG.url}/sounds/collections/${user.id}`)
      ]);

      if (!defaultRes.ok || !collectionsRes.ok) {
        throw new Error('Failed to load sounds data');
      }

      const defaultData = await defaultRes.json();
      const collectionsData = await collectionsRes.json();

      console.log(defaultData);
      console.log(collectionsData);

      setDefaultSounds(defaultData || []);
      setCollections(collectionsData || []);

      if (!collectionsData?.length) {
        await createDefaultCollection(user.id, defaultData);
      }
    } catch (error) {
      console.error('Error loading sounds:', error);
      Alert.alert('Error', 'Failed to load sounds');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createDefaultCollection = async (userId: string, defaultSounds: Sound[]) => {
    try {
      const response = await fetch(`${API_CONFIG.url}/sounds/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          name: 'Default Collection',
          is_active: true,
          collection_sounds: defaultSounds.map((sound, index) => ({
            sound_id: sound.id,
            sound_type: 'default',
            order_index: index,
            sound: sound
          }))
        }),
      });

      if (!response.ok) throw new Error('Failed to create collection');

      const newCollection = await response.json();
      setCollections([newCollection]);
    } catch (error) {
      console.error('Error creating default collection:', error);
    }
  };


  const handleSetActive = async (collectionId: string) => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/sounds/collections/${collectionId}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) throw new Error('Failed to activate collection');

      setCollections(prev => prev.map(collection => ({
        ...collection,
        is_active: collection.id === collectionId,
      })));
    } catch (error) {
      console.error('Error activating collection:', error);
      Alert.alert('Error', 'Failed to activate collection');
    }
  };

  const renderSoundCard = (sound: Sound, isActive?: boolean) => (
    <Pressable 
      key={sound.id} 
      style={[styles.soundCard, isActive && styles.soundCardActive]}
      onPress={() => {
        // TODO: Add sound preview functionality
        Alert.alert('Coming Soon', 'Sound preview will be available soon!');
      }}
    >
      <View style={[styles.soundIcon, isActive && styles.soundIconActive]}>
        <MaterialIcons 
          name={
            sound.category === 'attention' ? 'notifications' :
            sound.category === 'training' ? 'pets' :
            'music-note'
          } 
          size={24} 
          color={isActive ? theme.colors.text.inverse : theme.colors.primary} 
        />
      </View>
      <Text 
        style={[styles.soundName, isActive && styles.soundNameActive]}
        numberOfLines={1}
      >
        {sound.name}
      </Text>
    </Pressable>
  );

  const renderEmptyCollection = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="library-music" size={48} color={theme.colors.text.secondary} />
      <Text style={styles.emptyText}>No sounds in this collection</Text>
      <Text style={styles.emptySubtext}>Tap + to add sounds</Text>
    </View>
  );

  const handleAddPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Record Sound', 'Upload Sound', 'New Collection'],
          cancelButtonIndex: 0,
          userInterfaceStyle: 'light',
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) return;
          
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          switch (buttonIndex) {
            case 1:
              Alert.alert('Coming Soon', 'Sound recording will be available soon!');
              break;
            case 2:
              Alert.alert('Coming Soon', 'Sound upload will be available soon!');
              break;
            case 3:
              setIsCreateModalVisible(true);
              break;
          }
        }
      );
    } else {
      Alert.alert('Add New', 'Choose an option', [
        {
          text: 'Record Sound',
          onPress: () => Alert.alert('Coming Soon', 'Sound recording will be available soon!'),
        },
        {
          text: 'Upload Sound',
          onPress: () => Alert.alert('Coming Soon', 'Sound upload will be available soon!'),
        },
        {
          text: 'New Collection',
          onPress: () => setIsCreateModalVisible(true),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    }
  };

  const handleAddSounds = (collectionId: string) => {
    setSelectedCollectionId(collectionId);
    setIsAddSoundsVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your sounds...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Sounds</Text>
          <Text style={styles.subtitle}>Create the perfect mix for your pet</Text>
        </View>

        {/* Active Collection Section */}
        {collections.find(c => c.is_active) && (
          <View style={styles.activeSection}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="play-circle-filled" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Active Collection</Text>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.soundsScroll}
              contentContainerStyle={styles.soundsContent}
            >
              {collections
                .find(c => c.is_active)
                ?.collection_sounds?.map(({ sound }) => renderSoundCard(sound, true)) || []}
            </ScrollView>
          </View>
        )}

        {/* Collections Grid */}
        <View style={styles.collectionsSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="library-music" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Your Collections</Text>
          </View>
          {(collections || []).map(collection => (
            <Pressable 
              key={collection.id} 
              style={styles.collectionCard}
              onPress={() => handleSetActive(collection.id)}
            >
              <View style={styles.collectionInfo}>
                <Text style={styles.collectionName}>{collection.name}</Text>
                <Text style={styles.soundCount}>
                  {collection.collection_sounds?.length || 0} sounds
                </Text>
              </View>
              <View style={styles.collectionActions}>
                <Pressable
                  style={styles.addSoundsButton}
                  onPress={() => handleAddSounds(collection.id)}
                >
                  <MaterialIcons name="add" size={20} color={theme.colors.primary} />
                </Pressable>
                {collection.is_active && (
                  <View style={styles.activeIndicator}>
                    <MaterialIcons name="check-circle" size={20} color={theme.colors.primary} />
                  </View>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Default Sounds Section */}
        <View style={styles.defaultSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="music-note" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Default Sounds</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.soundsScroll}
            contentContainerStyle={styles.soundsContent}
          >
            {(defaultSounds || []).map(sound => renderSoundCard(sound))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable 
        style={styles.fab}
        onPress={handleAddPress}
      >
        <MaterialIcons name="add" size={28} color={theme.colors.text.inverse} />
      </Pressable>

      <CreateCollectionModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onAdd={(collection) => {
          setCollections(prev => [...prev, collection]);
          setIsCreateModalVisible(false);
        }}
        defaultSounds={defaultSounds}
      />

      <AddSoundsModal
        visible={isAddSoundsVisible}
        onClose={() => setIsAddSoundsVisible(false)}
        collectionId={selectedCollectionId!}
        defaultSounds={defaultSounds}
        onAdd={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  activeSection: {
    marginVertical: theme.spacing.lg,
  },
  collectionsSection: {
    marginVertical: theme.spacing.lg,
  },
  defaultSection: {
    marginVertical: theme.spacing.lg,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  soundCount: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  collectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  addSoundsButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
  },
  activeIndicator: {
    padding: theme.spacing.xs,
  },
  soundCard: {
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
    width: 100,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  soundCardActive: {
    backgroundColor: theme.colors.primary + '10',
  },
  soundIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  soundIconActive: {
    backgroundColor: theme.colors.primary,
  },
  soundName: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  soundNameActive: {
    color: theme.colors.primary,
  },
  soundsScroll: {
    flexGrow: 0,
  },
  soundsContent: {
    paddingHorizontal: theme.spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  loadingText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
}); 