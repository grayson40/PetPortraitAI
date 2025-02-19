import { View, Text, StyleSheet, Modal, Pressable, ScrollView, ActionSheetIOS } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { theme } from '../styles/theme';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { SoundService } from '../services/sound';

interface CollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  collection: {
    id: string;
    name: string;
    description: string;
    soundCount?: number;
    sounds?: Sound[];
  } | null;
  isPremium: boolean;
  onSoundSelect?: (soundId: string) => void;
  existingCollections?: Array<{id: string; name: string}>;
  onAddToCollection?: (collectionId: string, soundIds: string[]) => void;
}

interface Sound {
  id: string;
  name: string;
  category: string;
  isPremium: boolean;
  uri?: string;
}

export default function CollectionModal({ 
  visible, 
  onClose, 
  onSave,
  collection,
  isPremium,
  onSoundSelect,
  existingCollections,
  onAddToCollection
}: CollectionModalProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedSounds, setSelectedSounds] = useState<Set<string>>(new Set());

  if (!collection) return null;

  const handleSoundPress = async (sound: Sound) => {
    try {
      const soundService = SoundService.getInstance();
      
      if (playingId === sound.id) {
        // Stop playing
        await soundService.cleanup(false);
        setPlayingId(null);
      } else {
        // Start playing new sound
        if (playingId) {
          await soundService.cleanup(true);
        }
        
        await soundService.loadSound({
          id: sound.id,
          uri: sound.uri,
        });
        await soundService.playSound(sound.id);
        setPlayingId(sound.id);

        // Auto-stop after playback
        soundService.onPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setPlayingId(null);
          }
        });
      }
    } catch (error) {
      console.error('Error playing sound:', error);
      setPlayingId(null);
    }
  };

  const handleSoundSelect = (soundId: string) => {
    const newSelected = new Set(selectedSounds);
    if (newSelected.has(soundId)) {
      newSelected.delete(soundId);
    } else {
      newSelected.add(soundId);
    }
    setSelectedSounds(newSelected);
    onSoundSelect?.(soundId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{collection.name}</Text>
              <Text style={styles.description}>{collection.description}</Text>
            </View>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.secondary} />
            </Pressable>
          </View>

          {/* Sounds List */}
          <ScrollView style={styles.soundsList}>
            {collection.sounds ? (
              collection.sounds.map(sound => (
                <Pressable 
                  key={sound.id}
                  style={[
                    styles.soundItem,
                    selectedSounds.has(sound.id) && styles.selectedSound
                  ]}
                  onPress={() => handleSoundSelect(sound.id)}
                >
                  <View style={styles.soundInfo}>
                    <MaterialIcons 
                      name={selectedSounds.has(sound.id) ? "check-circle" : "radio-button-unchecked"} 
                      size={24} 
                      color={theme.colors.primary} 
                    />
                    <Text style={styles.soundName}>{sound.name}</Text>
                  </View>
                  <Pressable onPress={() => handleSoundPress(sound)}>
                    <MaterialIcons 
                      name={playingId === sound.id ? "pause" : "play-arrow"} 
                      size={24} 
                      color={theme.colors.primary} 
                    />
                  </Pressable>
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyText}>No sounds in this collection</Text>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.actions}>
            {selectedSounds.size > 0 && existingCollections && (
              <Pressable 
                style={styles.addToButton}
                onPress={() => {
                  ActionSheetIOS.showActionSheetWithOptions(
                    {
                      title: 'Add to Collection',
                      options: [
                        'Cancel',
                        ...existingCollections.map(c => c.name)
                      ],
                      cancelButtonIndex: 0,
                    },
                    async (buttonIndex) => {
                      if (buttonIndex > 0) {
                        const collection = existingCollections[buttonIndex - 1];
                        await onAddToCollection?.(
                          collection.id, 
                          Array.from(selectedSounds)
                        );
                        setSelectedSounds(new Set());
                        onClose();
                      }
                    }
                  );
                }}
              >
                <MaterialIcons 
                  name="playlist-add" 
                  size={24} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.addToText}>Add to Collection</Text>
              </Pressable>
            )}

            <Pressable 
              style={styles.saveButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onSave();
              }}
            >
              <Text style={styles.saveText}>
                {selectedSounds.size > 0 ? `Add ${selectedSounds.size} Sounds` : 'Save Collection'}
              </Text>
            </Pressable>
          </View>
        </View>
      </BlurView>
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
    marginTop: 100,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  description: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  soundsList: {
    flex: 1,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  soundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  soundName: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  actions: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  addToButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  addToText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  saveButton: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    padding: theme.spacing.xl,
  },
  selectedSound: {
    backgroundColor: theme.colors.primary + '10',
  },
}); 