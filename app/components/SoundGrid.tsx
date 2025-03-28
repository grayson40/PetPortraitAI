import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

export interface SoundGridProps {
  sounds: Array<{
    id: string;
    name: string;
    category: string;
    isPremium: boolean;
    isUserSound?: boolean;
  }>;
  onSoundPress: (sound: any) => void;
  isPlaying: boolean;
  playingSound: any | null;
  onLongPress?: (soundId: string) => void;
  isUserSounds?: boolean;
}

export const SoundGrid: React.FC<SoundGridProps> = ({
  sounds,
  onSoundPress,
  isPlaying,
  playingSound,
  onLongPress,
  isUserSounds = false
}) => {
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'dogs':
        return 'pets';
      case 'cats':
        return 'pets';
      case 'attention':
        return 'notifications-active';
      case 'reward':
        return 'emoji-events';
      case 'training':
        return 'fitness-center';
      case 'custom':
        return 'music-note';
      default:
        return 'volume-up';
    }
  };

  const handleLongPress = (soundId: string) => {
    if (onLongPress && isUserSounds) {
      onLongPress(soundId);
    }
  };

  const chunkArray = (array: any[], size: number) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  };

  // Group sounds into rows of 2
  const rows = chunkArray(sounds, 2);

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((sound) => (
            <TouchableOpacity
              key={sound.id}
              style={[
                styles.soundCard,
                playingSound?.id === sound.id && isPlaying && styles.playingCard,
                sound.isUserSound && styles.userSoundCard
              ]}
              onPress={() => onSoundPress(sound)}
              onLongPress={() => handleLongPress(sound.id)}
              delayLongPress={500}
            >
              <View style={styles.iconContainer}>
                <MaterialIcons
                  name={getCategoryIcon(sound.category)}
                  size={24}
                  color={
                    playingSound?.id === sound.id && isPlaying
                      ? "#FFFFFF"
                      : theme.colors.text.secondary
                  }
                />
              </View>
              <Text
                style={[
                  styles.soundName,
                  {
                    color:
                      playingSound?.id === sound.id && isPlaying
                        ? "#FFFFFF"
                        : theme.colors.text.primary,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {sound.name}
              </Text>
              <Text
                style={[
                  styles.soundCategory,
                  {
                    color:
                      playingSound?.id === sound.id && isPlaying
                        ? "#FFFFFF"
                        : theme.colors.text.secondary,
                  },
                ]}
              >
                {sound.category}
              </Text>
              {sound.isUserSound && (
                <View style={styles.userBadge}>
                  <Text style={styles.userBadgeText}>MY</Text>
                </View>
              )}
              {sound.isPremium && (
                <View style={styles.premiumBadge}>
                  <MaterialIcons name="star" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
          {row.length === 1 && <View style={styles.emptyCard} />}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  soundCard: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  playingCard: {
    backgroundColor: theme.colors.primary,
  },
  userSoundCard: {
    borderWidth: 1,
    borderColor: theme.colors.primary + '60',
  },
  iconContainer: {
    marginBottom: theme.spacing.sm,
  },
  soundName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    marginBottom: 2,
  },
  soundCategory: {
    fontSize: theme.typography.caption.fontSize,
    textTransform: 'capitalize',
  },
  emptyCard: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.warning,
    borderRadius: 4,
    padding: 2,
  },
  userBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: theme.colors.primary + '80',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  userBadgeText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: '600',
  },
}); 