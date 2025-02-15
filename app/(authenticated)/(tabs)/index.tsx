import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl, Pressable, Alert, ActionSheetIOS, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { SoundService } from '../../services/sound';
import { UserService } from '../../services/user';
import { Header } from './components/Header';
import { ActiveCollection } from './components/ActiveCollection';
import { SoundGrid } from './components/SoundGrid';
import LoadingIndicator from '../../components/LoadingIndicator';
import FilterSheet from '../../components/FilterSheet';
import { theme } from '../../styles/theme';
import { MaterialIcons } from '@expo/vector-icons';
import CreateCollectionModal from '../../components/CreateCollectionModal';
import AddSoundsModal from '../../components/AddSoundsModal';
import * as Haptics from 'expo-haptics';
import { CollectionService } from '../../services/collection';
import { LinearGradient } from 'expo-linear-gradient';
import { SoundPreviewPlayer } from '../../components/SoundPreviewPlayer';
import CollectionModal from '../../components/CollectionModal';
import MarketplaceModal from '../../components/MarketplaceModal';
import SubscriptionModal from '../../components/SubscriptionModal';
import { mockSounds } from '../../data/mockSounds';
import { getSupabase } from '../../services/supabase';

interface Sound {
  id: string;
  name: string;
  url?: string;
  category: string;
  isPremium: boolean;
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

interface SoundPack {
  id: string;
  name: string;
  description: string;
  price: string;
  image: any; // ImageSourcePropType
  sounds: Sound[];
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
    name: 'Dog Training',
    description: 'Essential sounds for dog photography',
    coverImage: '',
    soundCount: 25,
    isActive: false,
  },
  {
    id: 'cats',
    name: 'Cat Attention',
    description: 'Proven sounds to catch cat attention',
    coverImage: '',
    soundCount: 20,
    isActive: false,
  },
  // Add more featured collections
];

export default function SoundManagement() {
  const [sounds, setSounds] = useState<Sound[]>([]);
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
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [isCollectionModalVisible, setIsCollectionModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const isPremium = userProfile?.subscription_tier === 'premium';

  const filteredSounds = useMemo(() => {
    if (!activeFilters.length) return sounds;
    return sounds.filter(sound => 
      activeFilters.includes(sound.category.toLowerCase())
    );
  }, [sounds, activeFilters]);

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setInitialLoading(true);
      
      // Get fresh user profile first
      const userService = UserService.getInstance();
      await userService.refreshProfile();
      const profile = await userService.getUserProfile();
      setUserProfile(profile);

      // Initialize sound service with fresh data
      const soundService = SoundService.getInstance();
      await soundService.clearCache();
      await soundService.initialize();

      // Load appropriate sounds based on subscription
      if (profile?.subscription_tier === 'premium') {
        setSounds([...DEFAULT_SOUNDS, ...PREMIUM_SOUNDS]);
      } else {
        setSounds(DEFAULT_SOUNDS);
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
    return (
      <View style={styles.loadingContainer}>
        <LoadingIndicator />
        <Text style={styles.loadingText}>Loading your sounds...</Text>
      </View>
    );
  }

  const handleCollectionPress = (collection) => {
    setSelectedCollection(collection);
    setIsCollectionModalVisible(true);
  };

  const handleCreateCollection = async (name: string, selectedSounds: string[]) => {
    try {
      const collectionService = CollectionService.getInstance();
      const newCollection = await collectionService.createCollection(
        name,
        selectedSounds.map((soundId, index) => ({
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
      await collectionService.createCollection(
        selectedCollection.name,
        selectedCollection.sounds.map((sound, index) => ({
          sound_id: sound.id,
          order_index: index,
        }))
      );
      setIsCollectionModalVisible(false);
      setSelectedCollection(null);
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
      await collectionService.addSoundsToCollection(collectionId, soundIds);
      // Refresh collections
      const updatedCollections = await collectionService.getUserCollections();
      setCollections(updatedCollections);
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
      if (isPlaying && previewingSound?.id === sound.id) {
        setIsPlaying(false);
        setPreviewingSound(null);
      } else {
        setPreviewingSound(sound);
        setIsPlaying(true);
        const soundService = SoundService.getInstance();
        await soundService.playSound(sound.id);
      }
    } catch (error) {
      console.error('Error previewing sound:', error);
      setIsPlaying(false);
    }
  };

  const handleApplyFilters = (filters: string[]) => {
    setActiveFilters(filters);
    setIsFilterSheetVisible(false);
  };

  const handleSeeAllPress = () => {
    setIsMarketplaceVisible(true);
  };


  const renderPremiumView = () => (
    <>
      {/* Active Collection Card */}
      <ActiveCollection
        name={collections.find(c => c.is_active)?.name || 'Select a Collection'}
        soundCount={collections.find(c => c.is_active)?.collection_sounds.length || 0}
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
          decelerationRate="fast"
          snapToInterval={280 + theme.spacing.md}
        >
          {FEATURED_COLLECTIONS.map(collection => (
            <Pressable
              key={collection.id}
              style={styles.featuredCard}
              onPress={() => handleCollectionPress(collection)}
            >
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

  const handleFabPress = () => {
    if (!isPremium) {
      router.push('/profile/subscription');
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
    // Will implement in next phase
    Alert.alert('Coming Soon', 'Sound recording will be available soon!');
  };

  const handleUploadSound = async () => {
    // Will implement in next phase
    Alert.alert('Coming Soon', 'Sound upload will be available soon!');
  };

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
            onPress={() => setIsSubscriptionModalVisible(true)}
          >
            <Text style={styles.upgradeText}>Upgrade Now</Text>
          </Pressable>
        </View>
      </BlurView>
    </>
  );

  return (
    <View style={styles.container}>
      <Header 
        isPremium={isPremium} 
        onFilterPress={() => setIsFilterSheetVisible(true)}
      />
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {isPremium ? (
          renderPremiumView()
        ) : (
          renderBasicView()
        )}
      </ScrollView>

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
          onPlayPause={handlePlayPause}
          onClose={() => {
            setPreviewingSound(null);
            setIsPlaying(false);
          }}
        />
      )}

      <CollectionModal
        visible={isCollectionModalVisible}
        onClose={() => {
          setIsCollectionModalVisible(false);
          setSelectedCollection(null);
        }}
        onSave={handleSaveCollection}
        collection={selectedCollection}
        isPremium={isPremium}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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