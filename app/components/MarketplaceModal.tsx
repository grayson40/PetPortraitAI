import { View, Text, StyleSheet, Modal, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, SafeAreaView, Image, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { theme } from '../styles/theme';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import CollectionModal from './CollectionModal';
import { router } from 'expo-router';

interface Sound {
  id: string;
  name: string;
  url: string;
  category: 'attention' | 'reward' | 'training' | 'custom';
  description: string;
  isPremium: boolean;
  price?: number;
  creator?: {
    id: string;
    display_name: string;
  };
  stats?: {
    downloads: number;
    rating: number;
    reviews_count: number;
  };
}

interface SoundCollection {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  soundCount: number;
  featured?: boolean;
}

interface SoundPack {
  id: string;
  name: string;
  description: string;
  price: string;
  image: any; // ImageSourcePropType
  sounds: Sound[];
}

// Categories for filter pills
const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'featured', label: 'Featured', icon: 'star' },
  { id: 'dogs', label: 'Dogs', icon: 'pets' },
  { id: 'cats', label: 'Cats', icon: 'pets' },
  { id: 'training', label: 'Training', icon: 'school' },
  { id: 'attention', label: 'Attention', icon: 'notifications' },
] as const;

interface MarketplaceModalProps {
  visible: boolean;
  onClose: () => void;
  onCollectionPress: (collection: any) => void;
  isPremium: boolean;
  collections: any[];
}

export default function MarketplaceModal({
  visible,
  onClose,
  onCollectionPress,
  isPremium,
  collections
}: MarketplaceModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const [isCollectionModalVisible, setIsCollectionModalVisible] = useState(false);

  const handleCollectionPress = (collection: any) => {
    setSelectedCollection(collection);
    setIsCollectionModalVisible(true);
  };

  const handleCollectionClose = () => {
    setIsCollectionModalVisible(false);
    setSelectedCollection(null);
  };

  const handleSaveSuccess = async () => {
    try {
      await onCollectionPress(selectedCollection);
      handleCollectionClose();
      Alert.alert(
        'Success',
        'Collection saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose(); // Close marketplace modal
              router.replace('/(authenticated)/(tabs)'); // Navigate home
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save collection');
    }
  };

  const filteredCollections = collections.filter(collection => {
    const matchesSearch = collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         collection.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || collection.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView intensity={80} tint="light" style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.searchContainer}>
              <MaterialIcons 
                name="search" 
                size={24} 
                color={theme.colors.text.secondary} 
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search collections and sounds..."
                placeholderTextColor={theme.colors.text.secondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <MaterialIcons 
                    name="close" 
                    size={20} 
                    color={theme.colors.text.secondary} 
                  />
                </Pressable>
              )}
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            {CATEGORIES.map(category => (
              <Pressable
                key={category.id}
                style={[
                  styles.filterPill,
                  selectedCategory === category.id && styles.filterPillActive
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategory(category.id);
                }}
              >
                <MaterialIcons 
                  name={category.icon as keyof typeof MaterialIcons.glyphMap}
                  size={16}
                  color={selectedCategory === category.id 
                    ? theme.colors.primary 
                    : theme.colors.text.secondary
                  }
                />
                <Text style={[
                  styles.filterText,
                  selectedCategory === category.id && styles.filterTextActive
                ]}>
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={styles.collectionsList}>
            <View style={styles.collectionsGrid}>
              {filteredCollections.map(collection => (
                <Pressable
                  key={collection.id}
                  style={styles.collectionCard}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    handleCollectionPress(collection);
                  }}
                >
                  <View style={styles.cardImageContainer}>
                    <MaterialIcons 
                      name="library-music" 
                      size={32} 
                      color={theme.colors.primary} 
                    />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.collectionName} numberOfLines={1}>
                      {collection.name}
                    </Text>
                    <Text style={styles.collectionDescription} numberOfLines={2}>
                      {collection.description}
                    </Text>
                    <Text style={styles.soundCount}>
                      {collection.soundCount} sounds
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      </BlurView>

      <CollectionModal
        visible={isCollectionModalVisible}
        onClose={handleCollectionClose}
        onSave={handleSaveSuccess}
        collection={selectedCollection}
        isPremium={isPremium}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  content: {
    flex: 1,
    marginTop: 60,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  filterScroll: {
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterContainer: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 80,
    maxWidth: 120,
    height: 32,
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  filterTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  collectionsList: {
    flex: 1,
  },
  collectionsGrid: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  collectionCard: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  cardImageContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  collectionName: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  collectionDescription: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  soundCount: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
});

// Helper function to generate random colors for category backgrounds
const getRandomColor = () => {
  const colors = [
    '#1DB954', // Spotify green
    '#FF6B6B', // Coral
    '#4A90E2', // Blue
    '#9B59B6', // Purple
    '#F39C12', // Orange
    '#2ECC71', // Emerald
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}; 