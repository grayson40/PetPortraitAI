import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Sound } from '../data/mockSounds';

interface SoundStoreSectionProps {
  title: string;
  description?: string;
  sounds: Sound[];
  onBack: () => void;
  onSoundPress: (sound: Sound) => void;
  onSoundPreview: (sound: Sound) => void;
  playingSound: string | null;
  userSubscriptionTier: 'basic' | 'premium';
}

const getCategoryIcon = (category: string): keyof typeof MaterialIcons.glyphMap => {
  switch (category.toLowerCase()) {
    case 'attention':
      return 'notifications';
    case 'training':
      return 'school';
    case 'reward':
      return 'stars';
    case 'dogs':
    case 'cats':
      return 'pets';
    case 'birds':
      return 'air';
    case 'calming':
      return 'spa';
    case 'custom':
    default:
      return 'music-note';
  }
};

export default function SoundStoreSection({
  title,
  description,
  sounds,
  onBack,
  onSoundPress,
  onSoundPreview,
  playingSound,
  userSubscriptionTier,
}: SoundStoreSectionProps) {
  return (
    <View style={styles.container}>
      {/* Header */}
      {/* <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <View>
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      </View> */}

      {/* Sound List */}
      <ScrollView style={styles.content}>
        {sounds.map((sound, index) => (
          <Pressable
            key={sound.id}
            style={styles.soundRow}
            onPress={() => onSoundPress(sound)}
          >
            <View style={styles.indexContainer}>
              <Text style={styles.index}>{index + 1}</Text>
            </View>
            
            <View style={styles.soundInfo}>
              <View style={styles.soundIcon}>
                <MaterialIcons 
                  name={getCategoryIcon(sound.category)} 
                  size={32} 
                  color={theme.colors.text.inverse} 
                />
              </View>
              <View style={styles.soundDetails}>
                <Text style={styles.soundName}>{sound.name}</Text>
                <Text style={styles.soundCategory}>{sound.category}</Text>
                {sound.stats && (
                  <View style={styles.statsRow}>
                    <Text style={styles.statsText}>⭐️ {sound.stats.rating.toFixed(1)}</Text>
                    <Text style={styles.statsText}>•</Text>
                    <Text style={styles.statsText}>{sound.stats.downloads} downloads</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.playButton}
                onPress={() => onSoundPreview(sound)}
              >
                <MaterialIcons 
                  name={playingSound === sound.id ? 'stop' : 'play-arrow'} 
                  size={28} 
                  color={theme.colors.primary} 
                />
              </Pressable>
              {sound.isPremium && userSubscriptionTier !== 'premium' && (
                <MaterialIcons name="star" size={16} color={theme.colors.warning} />
              )}
              <MaterialIcons name="more-vert" size={24} color={theme.colors.text.secondary} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  description: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  content: {
    flex: 1,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  indexContainer: {
    width: 28,
    alignItems: 'center',
  },
  index: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  soundInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  soundIcon: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundDetails: {
    flex: 1,
  },
  soundName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  soundCategory: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  statsText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  playButton: {
    padding: theme.spacing.xs,
  },
}); 