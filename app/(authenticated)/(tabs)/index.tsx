import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl, Pressable, Alert, ActionSheetIOS, Image, FlatList, StatusBar } from 'react-native';
import { useState, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { SoundService } from '../../services/sound';
import { UserService } from '../../services/user';
import { Header } from './components/Header';
import { ActiveCollection } from './components/ActiveCollection';
import { SoundGrid } from './components/SoundGrid';
import LoadingIndicator from '../../components/LoadingIndicator';
import { theme } from '../../styles/theme';
import { MaterialIcons } from '@expo/vector-icons';
import CreateCollectionModal from '../../components/CreateCollectionModal';
import AddSoundsModal from '../../components/AddSoundsModal';
import * as Haptics from 'expo-haptics';
import { CollectionService } from '../../services/collection';
import { LinearGradient } from 'expo-linear-gradient';
import SoundPreviewPlayer from '../../components/SoundPreviewPlayer';
import CollectionModal from '../../components/CollectionModal';
import MarketplaceModal from '../../components/MarketplaceModal';
import SubscriptionModal from '../../components/SubscriptionModal';
import { mockSounds } from '../../data/mockSounds';
import { getSupabase } from '../../services/supabase';
import EditCollectionModal from '../../components/EditCollectionModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RecordSoundModal from '../../components/RecordSoundModal';
import UploadSoundModal from '../../components/UploadSoundModal';
import * as FileSystem from 'expo-file-system';
import { API_CONFIG } from '../../constants/config';

interface Sound {
  id: string;
  name: string;
  category: string;
  url?: string;
  isPremium: boolean;
  order_index?: number;
  icon?: string;
}

interface UserProfile {
  subscription_tier: string;
}

interface SoundCollection {
  id: string;
  name: string;
  is_active: boolean;
  collection_sounds: Array<{
    sound_id: string;
    sound_type: 'default' | 'marketplace' | 'user';
    order_index: number;
    sound: Sound;
  }>;
}


interface FeaturedCollection {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  soundCount: number;
  isActive: boolean;
}

interface PremiumFeature {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const getShadow = (size: 'small' | 'medium' | 'large') => {
  if (Platform.OS === 'ios') {
    return theme.shadows[size];
  }
  return {
    elevation: size === 'small' ? 3 : size === 'medium' ? 5 : 8,
  };
};

const DEFAULT_SOUNDS = mockSounds;

// Add more premium sounds
const PREMIUM_SOUNDS: Sound[] = [
  { id: '4', name: 'Pro Bark', category: 'dogs', isPremium: true },
  { id: '5', name: 'Pro Meow', category: 'cats', isPremium: true },
  { id: '6', name: 'Training Whistle', category: 'training', isPremium: true },
  { id: '7', name: 'Attention Bell', category: 'attention', isPremium: true },
  { id: '8', name: 'Reward Chime', category: 'reward', isPremium: true },
  { id: '9', name: 'Bird Call', category: 'birds', isPremium: true },
  // Add more premium sounds
];

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'sounds',
    title: 'Unlimited Sounds',
    description: 'Access 100+ professional pet attention sounds',
    icon: 'library-music',
  },
  {
    id: 'collections',
    title: 'Custom Collections',
    description: 'Create and manage your sound collections',
    icon: 'folder',
  },
  {
    id: 'recording',
    title: 'Sound Recording',
    description: 'Record and upload your own sounds',
    icon: 'mic',
  },
  {
    id: 'advanced',
    title: 'Advanced Features',
    description: 'Priority processing and premium support',
    icon: 'star',
  },
];

const FEATURED_COLLECTIONS: FeaturedCollection[] = [
  {
    id: 'dogs',
    name: 'Dog Attention',
    description: 'Essential sounds for dog photography',
    coverImage: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80',
    soundCount: 25,
    isActive: false,
  },
  {
    id: 'cats',
    name: 'Cat Attention',
    description: 'Proven sounds to catch cat attention',
    coverImage: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80',
    soundCount: 20,
    isActive: false,
  },
  // Add more featured collections
];

export default function SoundManagement() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [userSounds, setUserSounds] = useState<Sound[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isAddSoundsVisible, setIsAddSoundsVisible] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collections, setCollections] = useState<SoundCollection[]>([]);
  const [previewingSound, setPreviewingSound] = useState<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isMarketplaceVisible, setIsMarketplaceVisible] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<SoundCollection | null>(null);
  const [isCollectionModalVisible, setIsCollectionModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const activeCollection = collections.find(c => c.is_active);
  const [selectedCollectionSounds, setSelectedCollectionSounds] = useState<Sound[]>([]);
  const [isRecordModalVisible, setIsRecordModalVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

  const isPremium = userProfile?.subscription_tier === 'premium';

  const filteredSounds = useMemo(() => {
    if (!activeFilters.length) return sounds;
    return sounds.filter(sound => 
      activeFilters.includes(sound.category.toLowerCase())
    );
  }, [sounds, activeFilters]);
  
  const filteredUserSounds = useMemo(() => {
    if (!activeFilters.length) return userSounds;
    return userSounds.filter(sound => 
      activeFilters.includes(sound.category.toLowerCase())
    );
  }, [userSounds, activeFilters]);

  useEffect(() => {
    const inspectStorage = async () => {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      console.log('ASYNC STORAGE CONTENTS:', items);
    };
    inspectStorage();
  }, []);

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setInitialLoading(true);
      
      // Get fresh user profile first
      const userService = UserService.getInstance();
      await userService.refreshProfile();
      const profile = await userService.getUserProfile();
      setUserProfile(profile);

      // Fetch collections
      const collectionService = CollectionService.getInstance();
      const collections = await collectionService.getUserCollections();
      setCollections(collections);

      // Set active collection if exists
      const activeCollection = collections.find((c: SoundCollection) => c.is_active);
      if (activeCollection) {
        setSelectedCollection(activeCollection);
        // Load collection sounds
        const sounds = await collectionService.getCollectionSounds(activeCollection.id);
        setSelectedCollectionSounds(sounds);
        await AsyncStorage.setItem('selectedCollectionSounds', JSON.stringify(sounds));
        await AsyncStorage.setItem('activeCollectionId', activeCollection.id);
      }

      // Initialize sound service with fresh data
      const soundService = SoundService.getInstance();
      await soundService.clearCache();
      await soundService.initialize();

      // Load appropriate sounds based on subscription
      if (profile?.subscription_tier === 'premium') {
        setSounds([...DEFAULT_SOUNDS, ...PREMIUM_SOUNDS]);
        
        // Fetch user sounds if premium
        const userSounds = await soundService.getUserSounds();
        setUserSounds(userSounds);
      } else {
        setSounds(DEFAULT_SOUNDS);
        setUserSounds([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load sounds');
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(async (event, session) => {
      if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
        await loadData(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const initializeActiveCollection = async () => {
      try {
        const activeCollectionId = await AsyncStorage.getItem('activeCollectionId');
        const storedSounds = await AsyncStorage.getItem('selectedCollectionSounds');
        
        if (activeCollectionId && storedSounds) {
          setSelectedCollectionSounds(JSON.parse(storedSounds));
        }
      } catch (error) {
        console.error('Error initializing active collection:', error);
      }
    };

    initializeActiveCollection();
  }, []);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData(false);
    } catch (error) {
      console.error('Error refreshing:', error);
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  if (initialLoading) {
    return <LoadingIndicator message="Loading your sounds..." />;
  }

  const handleCollectionPress = (collection: FeaturedCollection) => {
    // Convert featured collection to the format expected by CollectionModal
    setSelectedCollection({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      soundCount: collection.soundCount,
      // For featured collections, sounds will be loaded when saving
      sounds: DEFAULT_SOUNDS.slice(0, collection.soundCount)
    });
    setIsCollectionModalVisible(true);
  };

  const handleCreateCollection = async (name: string, selectedSounds: string[]) => {
    try {
      const collectionService = CollectionService.getInstance();
      const newCollection = await collectionService.createCollection(
        name,
        selectedSounds.map((soundId: string, index: number) => ({
          sound_id: soundId,
          order_index: index,
        }))
      );
      setCollections(prev => [...prev, newCollection]);
      setIsCreateModalVisible(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error creating collection:', error);
      Alert.alert('Error', 'Failed to create collection');
    }
  };

  const handleSaveCollection = async () => {
    if (!selectedCollection) return;
    
    try {
      const collectionService = CollectionService.getInstance();
      const soundService = SoundService.getInstance();

      // For featured collections, we need to load the sounds first
      if (selectedCollection.soundCount) {
        // Create collection with featured collection details
        await collectionService.createCollection(
          selectedCollection.name,
          DEFAULT_SOUNDS.slice(0, selectedCollection.soundCount).map((sound, index) => ({
            sound_id: sound.id,
            order_index: index,
          }))
        );
      } else {
        // Regular collection save
        await collectionService.createCollection(
          selectedCollection.name,
          selectedCollection.sounds.map((sound, index) => ({
            sound_id: sound.id,
            order_index: index,
          }))
        );
      }

      setIsCollectionModalVisible(false);
      setSelectedCollection(null);
      await loadData(); // Refresh collections
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving collection:', error);
      Alert.alert('Error', 'Failed to save collection');
    }
  };

  const handleSetActive = async (collectionId: string) => {
    try {
      const collectionService = CollectionService.getInstance();
      await collectionService.setActiveCollection(collectionId);
      setCollections(prev => prev.map(collection => ({
        ...collection,
        is_active: collection.id === collectionId,
      })));
    } catch (error) {
      console.error('Error setting active collection:', error);
      Alert.alert('Error', 'Failed to set active collection');
    }
  };

  const handleAddSounds = async (collectionId: string, soundIds: string[]) => {
    try {
      const collectionService = CollectionService.getInstance();
      const collection = collections.find(c => c.id === collectionId);
      const startIndex = collection?.collection_sounds.length || 0;
      
      const soundsToAdd = soundIds.map((id, index) => ({
        collection_id: collectionId,
        sound_id: id,
        sound_type: 'default',
        order_index: startIndex + index
      }));

      await collectionService.addSoundsToCollection(collectionId, soundsToAdd);
      await loadData(); // Refresh collections
      Alert.alert('Success', 'Sounds added to collection');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error adding sounds:', error);
      Alert.alert('Error', 'Failed to add sounds');
    }
  };

  const getExistingSoundIds = (collectionId: string): string[] => {
    const collection = collections.find(c => c.id === collectionId);
    return collection?.collection_sounds.map(cs => cs.sound_id) || [];
  };

  const handlePlayPause = async (sound: Sound) => {
    try {
      const soundService = SoundService.getInstance();
      
      if (isPlaying && previewingSound?.id === sound.id) {
        // Just pause current sound
        setIsPlaying(false);
        await soundService.cleanup(false); // Don't unload, just stop
      } else {
        // Set UI state before attempting to play
        setPreviewingSound(sound);
        setIsPlaying(true);
        
        // For URL-based sounds (remote), ensure we have both url and uri properties
        const soundToPlay = {
          ...sound,
          uri: sound.uri || sound.url,
        };
        
        try {
          // Load sound if it's new
          if (!previewingSound || previewingSound.id !== sound.id) {
            await soundService.cleanup(true); // Unload previous sound
            await soundService.loadSound({
              id: sound.id,
              uri: soundToPlay.uri,
            });
          }
          
          // Play the sound
          await soundService.playSound(sound.id);
          
          // Reset play state when sound finishes
          soundService.onPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          });
        } catch (err) {
          // If there's an error loading/playing the sound, reset UI state
          console.error('Error with sound playback:', err);
          setIsPlaying(false);
          
          // Show error only for serious failures
          if (err instanceof Error && err.message && err.message.includes('not loaded')) {
            Alert.alert('Playback Error', 'Could not play this sound. It may be unavailable.');
          }
        }
      }
    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPlaying(false);
      Alert.alert('Error', 'Failed to play sound');
    }
  };

  // Add cleanup handler for preview close
  const handlePreviewClose = async () => {
    const soundService = SoundService.getInstance();
    await soundService.cleanup(true); // Fully unload when closing preview
    setPreviewingSound(null);
    setIsPlaying(false);
  };

  const handleApplyFilters = (filters: string[]) => {
    setActiveFilters(filters);
    setIsFilterSheetVisible(false);
  };

  const handleSeeAllPress = () => {
    setIsMarketplaceVisible(true);
  };

  const handleActiveCollectionPress = () => {
    if (activeCollection) {
      // Set the selected collection with all required properties
      setSelectedCollection({
        id: activeCollection.id,
        name: activeCollection.name,
        is_active: activeCollection.is_active,
        collection_sounds: activeCollection.collection_sounds || []
      });
      
      // Show the edit modal
      setIsEditModalVisible(true);
    }
  };

  const handleReorderSounds = async (from: number, to: number) => {
    if (!selectedCollection) return;
    
    try {
      const collectionService = CollectionService.getInstance();
      await collectionService.reorderSounds(selectedCollection.id, from, to);
      await loadData(); // Refresh collections
    } catch (error) {
      console.error('Error reordering sounds:', error);
      Alert.alert('Error', 'Failed to reorder sounds');
    }
  };

  const handleRemoveSound = async (soundId: string) => {
    if (!selectedCollection) return;

    try {
      const collectionService = CollectionService.getInstance();
      await collectionService.removeSoundFromCollection(selectedCollection.id, soundId);
      await loadData(); // Refresh collections
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error removing sound:', error);
      Alert.alert('Error', 'Failed to remove sound');
    }
  };

  const handleDeleteUserSound = async (soundId: string) => {
    try {
      // Show confirmation dialog
      Alert.alert(
        'Delete Sound',
        'Are you sure you want to delete this sound? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              // Delete from backend
              const soundService = SoundService.getInstance();
              await soundService.deleteUserSound(soundId);
              
              // Remove from state
              setUserSounds(prevSounds => prevSounds.filter(sound => sound.id !== soundId));
              
              // Close preview if it's the deleted sound
              if (previewingSound?.id === soundId) {
                handlePreviewClose();
              }
              
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Success', 'Sound deleted successfully');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting sound:', error);
      Alert.alert('Error', 'Failed to delete sound');
    }
  };

  const handleSaveRecordedSound = async (newSound: {
    id: string;
    name: string;
    category: string;
    uri: string;
    isPremium: boolean;
    icon: string;
  }) => {
    try {
      // Add the new sound to the local sounds state
      const soundWithUserFlag = {
        ...newSound,
        isUserSound: true
      };
      setUserSounds(prevSounds => [soundWithUserFlag as unknown as Sound, ...prevSounds]);
      
      // Show loading UI feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `"${newSound.name}" has been added to your sounds.`);
      
      // Convert the local file to base64
      const fileContent = await FileSystem.readAsStringAsync(newSound.uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Get user ID from Supabase auth
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');
      
      // Send to backend
      const response = await fetch(`${API_CONFIG.url}/user-sounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({
          name: newSound.name,
          category: newSound.category,
          file: `data:audio/m4a;base64,${fileContent}`,
          isPremium: newSound.isPremium
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload sound');
      }
      
      // Get the server response with the sound details
      const soundData = await response.json();
      console.log('Sound uploaded successfully:', soundData);
      
      // Update the sound in state with the server-provided data
      setUserSounds(prevSounds => prevSounds.map(sound => 
        sound.id === newSound.id ? {
          ...sound,
          id: soundData.id,
          url: soundData.url,
          uri: soundData.url
        } : sound
      ));
      
    } catch (error) {
      console.error('Error saving recorded sound:', error);
      // Don't show error to user since we already showed success
      // This allows for graceful failure without disrupting UX
    }
  };

  const handleSaveUploadedSound = async (newSound: {
    id: string;
    name: string;
    category: string;
    uri: string;
    isPremium: boolean;
    icon: string;
  }) => {
    try {
      // Add the new sound to the local sounds state
      const soundWithUserFlag = {
        ...newSound,
        isUserSound: true
      };
      setUserSounds(prevSounds => [soundWithUserFlag as unknown as Sound, ...prevSounds]);
      
      // Show confirmation message
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `"${newSound.name}" has been added to your sounds.`);
      
      // Convert the local file to base64
      const fileContent = await FileSystem.readAsStringAsync(newSound.uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Get file extension from URI
      const fileExtension = newSound.uri.split('.').pop()?.toLowerCase() || 'mp3';
      const mimeType = fileExtension === 'm4a' ? 'audio/m4a' : 
                      fileExtension === 'mp3' ? 'audio/mp3' : 
                      fileExtension === 'wav' ? 'audio/wav' : 'audio/mpeg';
      
      // Get user ID from Supabase auth
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');
      
      // Send to backend
      const response = await fetch(`${API_CONFIG.url}/user-sounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': user.id
        },
        body: JSON.stringify({
          name: newSound.name,
          category: newSound.category,
          file: `data:${mimeType};base64,${fileContent}`,
          isPremium: newSound.isPremium
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload sound');
      }
      
      // Get the server response with the sound details
      const soundData = await response.json();
      console.log('Sound uploaded successfully:', soundData);
      
      // Update the sound in state with the server-provided data
      setUserSounds(prevSounds => prevSounds.map(sound => 
        sound.id === newSound.id ? {
          ...sound,
          id: soundData.id,
          url: soundData.url,
          uri: soundData.url
        } : sound
      ));
      
    } catch (error) {
      console.error('Error saving uploaded sound:', error);
      // Don't show error to user since we already showed success
      // This allows for graceful failure without disrupting UX
    }
  };

  const renderPremiumView = () => (
    <>
      {/* Active Collection Card */}
      <ActiveCollection
        collection={activeCollection || {
          id: '',
          name: 'Select a Collection',
          collection_sounds: [],
        }}
        onPress={activeCollection ? handleActiveCollectionPress : undefined}
      />

      {/* User Collections */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Collections</Text>
          <Pressable 
            style={styles.addButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setIsCreateModalVisible(true);
            }}
          >
            <MaterialIcons name="add" size={24} color={theme.colors.primary} />
          </Pressable>
        </View>

        {collections.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.collectionsScroll}
          >
            {collections.map(collection => (
              <Pressable
                key={collection.id}
                style={[
                  styles.collectionCard,
                  collection.is_active && styles.activeCard
                ]}
                onPress={() => handleSetActive(collection.id)}
              >
                <MaterialIcons 
                  name={collection.is_active ? "folder-special" : "folder"} 
                  size={24} 
                  color={collection.is_active ? theme.colors.primary : theme.colors.text.secondary} 
                />
                <Text style={[
                  styles.collectionName,
                  { color: theme.colors.text.primary }
                ]}>
                  {collection.name}
                </Text>
                <Text style={[
                  styles.soundCount,
                  { color: theme.colors.text.secondary }
                ]}>
                  {collection.collection_sounds.length} sounds
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons 
              name="library-music" 
              size={48} 
              color={theme.colors.text.secondary} 
            />
            <Text style={styles.emptyText}>
              Create your first collection
            </Text>
          </View>
        )}
      </View>

      {/* Featured Collections */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Collections</Text>
          <Pressable 
            style={styles.seeAllButton} 
            onPress={handleSeeAllPress}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <MaterialIcons 
              name="arrow-forward" 
              size={20} 
              color={theme.colors.primary} 
            />
          </Pressable>
        </View>

        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.featuredScroll}
        >
          {FEATURED_COLLECTIONS.map((collection) => (
            <Pressable
              key={collection.id}
              style={styles.featuredCard}
              onPress={() => handleCollectionPress(collection)}
            >
              <Image
                source={{ uri: collection.coverImage }}
                style={styles.collectionImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.collectionName}>{collection.name}</Text>
                  <Text style={styles.collectionDescription}>
                    {collection.description}
                  </Text>
                  <Text style={styles.soundCount}>
                    {collection.soundCount} sounds
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* User Sounds Section */}
      {userSounds.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Sounds</Text>
            <Pressable 
              style={styles.addButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleFabPress();
              }}
            >
              <MaterialIcons name="add" size={24} color={theme.colors.primary} />
            </Pressable>
          </View>
          <SoundGrid
            sounds={filteredUserSounds}
            onSoundPress={handlePlayPause}
            isPlaying={isPlaying}
            playingSound={previewingSound}
            onLongPress={handleDeleteUserSound}
            isUserSounds={true}
          />
        </View>
      )}

      {/* All Sounds Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Sounds</Text>
        <SoundGrid
          sounds={filteredSounds}
          onSoundPress={handlePlayPause}
          isPlaying={isPlaying}
          playingSound={previewingSound}
        />
      </View>
    </>
  );

  const renderBasicView = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Sounds</Text>
        <SoundGrid
          sounds={DEFAULT_SOUNDS}
          onSoundPress={handlePlayPause}
          isPlaying={isPlaying}
          playingSound={previewingSound}
        />
      </View>
      <BlurView intensity={80} tint="light" style={styles.premiumPreview}>
        <View style={styles.premiumContent}>
          <MaterialIcons name="star" size={32} color={theme.colors.warning} />
          <View style={styles.headerContent}>
            <Text style={styles.premiumTitle}>Unlock Premium</Text>
            <Text style={styles.premiumSubtitle}>
              Get unlimited access to all premium features
            </Text>
          </View>
          
          <View style={styles.premiumFeatures}>
            {PREMIUM_FEATURES.map(feature => (
              <View key={feature.id} style={styles.premiumFeature}>
                <View style={styles.featureHeader}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons 
                      name={feature.icon} 
                      size={20} 
                      color={theme.colors.warning} 
                    />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                </View>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>

          <Pressable 
            style={styles.upgradeButton}
            // onPress={() => setIsSubscriptionModalVisible(true)}
            onPress={() => Alert.alert('Coming Soon', 'Premium features will be available in a future update.')}
          >
            <Text style={styles.upgradeText}>Upgrade Now</Text>
          </Pressable>
        </View>
      </BlurView>
    </>
  );

  const handleFabPress = () => {
    if (!isPremium) {
      return;
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Record Sound', 'Upload Sound', 'New Collection'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          if (buttonIndex === 0) return;
          
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          switch (buttonIndex) {
            case 1:
              handleRecordSound();
              break;
            case 2:
              handleUploadSound();
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
          onPress: handleRecordSound,
        },
        {
          text: 'Upload Sound',
          onPress: handleUploadSound,
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

  const handleRecordSound = async () => {
    if (!isPremium) {
      Alert.alert('Premium Feature', 'Recording sounds is a premium feature. Please upgrade to use this feature.');
      return;
    }
    
    // Open the recording modal
    setIsRecordModalVisible(true);
  };

  const handleUploadSound = async () => {
    if (!isPremium) {
      Alert.alert('Premium Feature', 'Uploading sounds is a premium feature. Please upgrade to use this feature.');
      return;
    }
    
    // Open the upload modal
    setIsUploadModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Header 
        isPremium={isPremium} 
        onFilterPress={() => setIsFilterSheetVisible(true)}
      />
      
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={() => (
          <>
            {isPremium ? (
              renderPremiumView()
            ) : (
              renderBasicView()
            )}
          </>
        )}
        ListFooterComponent={() => (
          // Add extra padding at the bottom to prevent FAB from covering content
          <View style={{ paddingBottom: 100 }} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      />

      {isPremium && (
        <Pressable 
          style={[styles.fab, styles.fabPremium]}
          onPress={handleFabPress}
        >
          <MaterialIcons 
            name="add" 
            size={28} 
            color="#FFF" 
          />
        </Pressable>
      )}

      <CreateCollectionModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onCreate={handleCreateCollection}
        sounds={sounds}
      />

      <AddSoundsModal
        visible={isAddSoundsVisible}
        onClose={() => setIsAddSoundsVisible(false)}
        onAdd={(soundIds) => handleAddSounds(selectedCollectionId!, soundIds)}
        sounds={sounds}
        existingSoundIds={selectedCollectionId ? getExistingSoundIds(selectedCollectionId) : []}
      />

      {previewingSound && (
        <SoundPreviewPlayer
          sound={previewingSound}
          isPlaying={isPlaying}
          onPlayPause={() => handlePlayPause(previewingSound)}
          onClose={handlePreviewClose}
        />
      )}

      {isEditModalVisible && selectedCollection && (
        <EditCollectionModal
          visible={isEditModalVisible}
          onClose={() => {
            setIsEditModalVisible(false);
            setSelectedCollection(null);
          }}
          collection={selectedCollection}
          onReorder={handleReorderSounds}
          onRemoveSound={handleRemoveSound}
          onAddSounds={() => {
            setIsEditModalVisible(false);
            setIsAddSoundsVisible(true);
          }}
        />
      )}

      <CollectionModal
        visible={isCollectionModalVisible}
        onClose={() => setIsCollectionModalVisible(false)}
        onSave={handleSaveCollection}
        collection={selectedCollection}
        isPremium={isPremium}
        existingCollections={collections}
        onAddToCollection={handleAddSounds}
      />

      <MarketplaceModal
        visible={isMarketplaceVisible}
        onClose={() => setIsMarketplaceVisible(false)}
        onCollectionPress={handleCollectionPress}
        isPremium={isPremium}
        collections={FEATURED_COLLECTIONS}
      />

      <SubscriptionModal
        visible={isSubscriptionModalVisible}
        onClose={() => setIsSubscriptionModalVisible(false)}
        currentTier="basic"
        loading={upgrading}
      />

      <RecordSoundModal
        visible={isRecordModalVisible}
        onClose={() => setIsRecordModalVisible(false)}
        onSave={handleSaveRecordedSound}
      />

      <UploadSoundModal
        visible={isUploadModalVisible}
        onClose={() => setIsUploadModalVisible(false)}
        onSave={handleSaveUploadedSound}
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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
  },
  premiumPreview: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  premiumContent: {
    padding: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  premiumTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  premiumSubtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  section: {
    padding: theme.spacing.lg,
    paddingBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
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
    ...getShadow('large'),
  },
  fabPremium: {
    backgroundColor: theme.colors.primary,
  },
  fabBasic: {
    backgroundColor: theme.colors.warning,
  },
  collectionCard: {
    width: 160,
    padding: theme.spacing.md,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    ...getShadow('small'),
    gap: theme.spacing.xs,
  },
  activeCard: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary,
    borderWidth: 1,
  },
  collectionName: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    color: '#FFF',
  },
  soundCount: {
    fontSize: theme.typography.caption.fontSize,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
  packsScroll: {
    padding: theme.spacing.md,
  },
  packCard: {
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.md,
  },
  packImageContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  packImage: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.md,
  },
  packGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  includedText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  packName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.sm,
  },
  packDescription: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  premiumPrice: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  premiumFeatures: {
    width: '100%',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  premiumFeature: {
    gap: 4,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  featureDescription: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    lineHeight: 16,
    marginLeft: 32,
  },
  upgradeButton: {
    width: '100%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.warning,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    ...getShadow('medium'),
  },
  upgradeText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: '#FFF',
  },
  featuredScroll: {
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  featuredCard: {
    width: 280,
    height: 160,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...getShadow('medium'),
  },
  collectionImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    padding: theme.spacing.md,
    justifyContent: 'flex-end',
  },
  cardContent: {
    gap: theme.spacing.xs,
  },
  collectionDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionsScroll: {
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
  },
  headerContent: {
    gap: theme.spacing.sm,
  },
}); 