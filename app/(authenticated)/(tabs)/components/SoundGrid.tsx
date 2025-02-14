import { View, Text, StyleSheet, Pressable, Platform, ScrollView, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { theme } from '../../../styles/theme';

interface Sound {
  id: string;
  name: string;
  category: string;
  isPremium: boolean;
}

interface SoundGridProps {
  sounds: Sound[];
  onSoundPress: (sound: Sound) => void;
  isPremium: boolean;
}

const getShadow = (size: 'small' | 'medium' | 'large') => {
  if (Platform.OS === 'ios') {
    return theme.shadows[size];
  }
  return {
    elevation: size === 'small' ? 3 : size === 'medium' ? 5 : 8,
  };
};

const getCategoryIcon = (category: string): keyof typeof MaterialIcons.glyphMap => {
  switch (category.toLowerCase()) {
    case 'attention': return 'notifications';
    case 'training': return 'school';
    case 'reward': return 'stars';
    case 'dogs': case 'cats': return 'pets';
    case 'birds': return 'air';
    case 'calming': return 'spa';
    default: return 'music-note';
  }
};

// Update categories to match sound types from CONTEXT.md
const CATEGORIES = [
  { id: 'all', label: 'All Sounds', icon: 'music-note' },
  { id: 'attention', label: 'Attention', icon: 'notifications' },
  { id: 'training', label: 'Training', icon: 'school' },
  { id: 'dogs', label: 'Dogs', icon: 'pets' },
  { id: 'cats', label: 'Cats', icon: 'pets' },
  { id: 'reward', label: 'Reward', icon: 'stars' },
] as const;

export function SoundGrid({ sounds, onSoundPress, isPremium }: SoundGridProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredSounds = selectedCategory === 'all' 
    ? sounds 
    : sounds.filter(sound => sound.category === selectedCategory);

  const renderSoundItem = ({ item: sound }: { item: Sound }) => (
    <Pressable
      style={[
        styles.soundCard,
        !isPremium && sound.isPremium && styles.soundCardLocked
      ]}
      onPress={() => onSoundPress(sound)}
    >
      <View style={styles.soundContent}>
        <View style={styles.iconContainer}>
          <MaterialIcons 
            name={getCategoryIcon(sound.category)} 
            size={24} 
            color={theme.colors.text.primary} 
          />
        </View>
        <View style={styles.soundInfo}>
          <Text style={styles.soundName}>{sound.name}</Text>
          <Text style={styles.categoryLabel}>{sound.category}</Text>
        </View>
        <View style={styles.rightContent}>
          {sound.isPremium && (
            <View style={styles.premiumBadge}>
              <MaterialIcons 
                name="star" 
                size={12} 
                color={theme.colors.warning} 
              />
            </View>
          )}
          <MaterialIcons 
            name="play-arrow" 
            size={24} 
            color={theme.colors.primary} 
          />
        </View>
      </View>
      {!isPremium && sound.isPremium && (
        <View style={styles.lockOverlay}>
          <MaterialIcons name="lock" size={20} color="#FFF" />
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Filter Pills Row */}
      <View style={styles.filterRow}>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {CATEGORIES.map(category => (
            <Pressable
              key={category.id}
              style={[
                styles.filterPill,
                selectedCategory === category.id && styles.filterPillActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <MaterialIcons 
                name={category.icon as keyof typeof MaterialIcons.glyphMap}
                size={18}
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
      </View>

      {/* Sounds List */}
      <FlatList
        data={filteredSounds}
        renderItem={renderSoundItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Filter Styles
  filterRow: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  filterContainer: {
    gap: theme.spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  filterTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  // List Styles
  listContainer: {
    paddingHorizontal: 0,
    paddingVertical: theme.spacing.lg,
  },
  soundCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...getShadow('small'),
  },
  soundContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  soundName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  categoryLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    textTransform: 'capitalize',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  premiumBadge: {
    backgroundColor: theme.colors.warning + '20',
    borderRadius: theme.borderRadius.sm,
    padding: 4,
  },
  separator: {
    height: theme.spacing.sm,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundCardLocked: {
    opacity: 0.7,
  },
}); 