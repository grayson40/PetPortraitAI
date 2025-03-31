import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, ScrollView, FlatList, Animated, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import * as Haptics from 'expo-haptics';

interface Sound {
  id: string;
  name: string;
  category: string;
  isPremium?: boolean;
  isUserSound?: boolean;
  icon?: string;
}

interface SoundGridProps {
  sounds: Sound[];
  onSoundPress: (sound: Sound) => void;
  isPlaying?: boolean;
  playingSound?: Sound | null;
  onLongPress?: (sound: Sound) => void;
  isUserSounds?: boolean;
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

export function SoundGrid({ 
  sounds, 
  onSoundPress, 
  isPlaying = false,
  playingSound = null,
  onLongPress,
  isUserSounds = false 
}: SoundGridProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [pressedSound, setPressedSound] = useState<string | null>(null);
  const [scaleAnimations] = useState<{[key: string]: Animated.Value}>({});
  const [longPressActive, setLongPressActive] = useState(false);
  const longPressTimeout = React.useRef<NodeJS.Timeout | null>(null);

  // Initialize scale animation for each sound
  React.useEffect(() => {
    sounds.forEach(sound => {
      if (!scaleAnimations[sound.id]) {
        scaleAnimations[sound.id] = new Animated.Value(1);
      }
    });
  }, [sounds]);

  const handlePressIn = (sound: Sound) => {
    setPressedSound(sound.id);
    
    // Start scale animation
    Animated.spring(scaleAnimations[sound.id] || new Animated.Value(1), {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
    }).start();
    
    // Set a timeout for long press
    if (onLongPress && sound.isUserSound) {
      setLongPressActive(true);
      longPressTimeout.current = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress(sound);
        setLongPressActive(false);
      }, 500);
    }
  };

  const handlePressOut = (sound: Sound) => {
    setPressedSound(null);
    
    // Reset scale animation
    Animated.spring(scaleAnimations[sound.id] || new Animated.Value(1), {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
    
    // Clear long press timeout
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handlePress = (sound: Sound) => {
    // Only trigger regular press if long press wasn't activated
    if (!longPressActive) {
      onSoundPress(sound);
    }
    setLongPressActive(false);
  };

  const filteredSounds = selectedCategory === 'all' 
    ? sounds 
    : sounds.filter(sound => sound.category === selectedCategory);

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
        numColumns={2}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isCurrentlyPlaying = isPlaying && playingSound?.id === item.id;
          
          return (
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.soundItem,
                  {
                    transform: [{ scale: scaleAnimations[item.id] || new Animated.Value(1) }]
                  }
                ]}
              >
                <Pressable
                  style={[
                    styles.soundCard,
                    isCurrentlyPlaying && styles.playingCard,
                    item.isPremium && styles.premiumCard,
                    item.isUserSound && styles.userSoundCard,
                    pressedSound === item.id && styles.pressedCard
                  ]}
                  onPress={() => handlePress(item)}
                  onPressIn={() => handlePressIn(item)}
                  onPressOut={() => handlePressOut(item)}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                      <MaterialIcons
                        name={isCurrentlyPlaying ? 'pause' : item.icon as keyof typeof MaterialIcons.glyphMap || getCategoryIcon(item.category)}
                        size={28}
                        color={isCurrentlyPlaying ? theme.colors.text.inverse : theme.colors.primary}
                      />
                    </View>
                    <Text style={styles.soundName} numberOfLines={2}>{item.name}</Text>
                  </View>
                  
                  {item.isPremium && (
                    <View style={styles.premiumIndicator}>
                      <MaterialIcons 
                        name="star" 
                        size={14} 
                        color="#FFD700" 
                      />
                    </View>
                  )}
                  
                  {item.isUserSound && (
                    <View style={styles.userIndicator}>
                      <MaterialIcons 
                        name="edit" 
                        size={12} 
                        color="#FFF" 
                      />
                    </View>
                  )}
                </Pressable>
              </Animated.View>
            </TouchableWithoutFeedback>
          );
        }}
        contentContainerStyle={styles.grid}
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
  grid: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  soundItem: {
    width: '50%',
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  soundCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    minHeight: 90,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  playingCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: `${theme.colors.primary}10`,
  },
  premiumCard: {
    borderColor: theme.colors.warning,
    borderWidth: 1,
  },
  userSoundCard: {
    borderColor: theme.colors.primary,
    borderWidth: 1,
    position: 'relative',
  },
  pressedCard: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  soundName: {
    fontSize: 14,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    fontWeight: '500',
  },
  userIndicator: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.warning,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 