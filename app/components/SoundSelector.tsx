import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Sound } from '../data/mockSounds';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const BUTTON_SIZE = 70;

interface SoundSelectorProps {
  sounds: Sound[];
  selectedSound: Sound | null;
  onSelectSound: (sound: Sound) => void;
  isPlaying: boolean;
  userTier?: 'basic' | 'premium';
}

export default function SoundSelector({ 
  sounds, 
  selectedSound, 
  onSelectSound,
  isPlaying,
  userTier = 'basic'
}: SoundSelectorProps) {
  if (!sounds || sounds.length === 0) {
    return (
      <BlurView intensity={20} style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No sounds available</Text>
        </View>
      </BlurView>
    );
  }

  return (
    <BlurView intensity={20} style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sounds.map((sound) => {
          const isSelected = selectedSound?.id === sound.id;
          const isLocked = sound.isPremium && userTier === 'basic';
          
          return (
            <Pressable
              key={sound.id}
              style={[
                styles.soundButton,
                isSelected && styles.selectedSound,
                isSelected && isPlaying && styles.playingSound,
                isLocked && styles.premiumButton
              ]}
              onPress={() => onSelectSound(sound)}
              disabled={isLocked}
            >
              <View style={styles.iconContainer}>
                <MaterialIcons 
                  name={(sound.icon as keyof typeof MaterialIcons.glyphMap) || 'music-note'} 
                  size={28} 
                  color={isSelected ? 
                    theme.colors.primary : 
                    theme.colors.text.inverse
                  } 
                />
                {isSelected && isPlaying && (
                  <View style={styles.playingIndicator} />
                )}
              </View>
              <Text 
                style={[
                  styles.soundName,
                  isSelected && styles.selectedText
                ]}
                numberOfLines={1}
              >
                {sound.name}
              </Text>
              {isLocked && (
                <MaterialIcons 
                  name="lock" 
                  size={16} 
                  color={theme.colors.primary} 
                  style={styles.premiumIcon}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    height: BUTTON_SIZE + 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  soundButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectedSound: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: theme.colors.primary,
  },
  playingSound: {
    transform: [{ scale: 1.05 }],
  },
  iconContainer: {
    position: 'relative',
  },
  playingIndicator: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginLeft: -2,
  },
  soundName: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.caption.fontSize,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
    maxWidth: BUTTON_SIZE - theme.spacing.sm * 2,
  },
  selectedText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  premiumIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  premiumButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: theme.colors.primary,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
  },
}); 