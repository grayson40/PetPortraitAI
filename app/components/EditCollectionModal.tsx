import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { theme } from '../styles/theme';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { SoundService } from '../services/sound';
import DraggableFlatList, { 
  RenderItemParams,
  ScaleDecorator 
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface EditCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  collection: {
    id: string;
    name: string;
    collection_sounds: Array<{
      sound_id: string;
      order_index: number;
      sound: {
        id: string;
        name: string;
        url?: string;
      };
    }>;
  };
  onReorder: (from: number, to: number) => Promise<void>;
  onRemoveSound: (soundId: string) => Promise<void>;
  onAddSounds: () => void;
}

export default function EditCollectionModal({
  visible,
  onClose,
  collection,
  onReorder,
  onRemoveSound,
  onAddSounds,
}: EditCollectionModalProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const handlePlaySound = async (soundId: string, url?: string) => {
    try {
      const soundService = SoundService.getInstance();
      
      if (playingId === soundId) {
        await soundService.cleanup(true);
        setPlayingId(null);
      } else {
        if (playingId) {
          await soundService.cleanup(true);
        }
        
        await soundService.loadSound({
          id: soundId,
          uri: url,
        });
        await soundService.playSound(soundId);
        setPlayingId(soundId);

        soundService.onPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            soundService.cleanup(true);
            setPlayingId(null);
          }
        });
      }
    } catch (error) {
      console.error('Error playing sound:', error);
      setPlayingId(null);
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<typeof collection.collection_sounds[0]>) => (
    <ScaleDecorator>
      <Pressable 
        style={[
          styles.soundItem,
          isActive && styles.dragging
        ]}
        onLongPress={isReordering ? drag : undefined}
      >
        <View style={styles.soundInfo}>
          {isReordering && (
            <MaterialIcons 
              name="drag-handle" 
              size={24} 
              color={theme.colors.text.secondary} 
            />
          )}
          <Text style={styles.soundName}>{item.sound.name}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable 
            onPress={() => handlePlaySound(item.sound.id, item.sound.url)}
            style={styles.actionButton}
          >
            <MaterialIcons 
              name={playingId === item.sound.id ? "pause" : "play-arrow"} 
              size={24} 
              color={theme.colors.primary} 
            />
          </Pressable>
          <Pressable 
            onPress={() => onRemoveSound(item.sound.id)}
            style={styles.actionButton}
          >
            <MaterialIcons 
              name="remove-circle-outline" 
              size={24} 
              color={theme.colors.error} 
            />
          </Pressable>
        </View>
      </Pressable>
    </ScaleDecorator>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <BlurView intensity={80} tint="light" style={styles.overlay}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{collection.name}</Text>
                <Text style={styles.count}>
                  {collection.collection_sounds.length} sounds
                </Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable 
                  style={styles.actionButton}
                  onPress={() => {
                    setIsReordering(!isReordering);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <MaterialIcons 
                    name={isReordering ? "done" : "reorder"} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </Pressable>
                <Pressable 
                  style={styles.actionButton}
                  onPress={onAddSounds}
                >
                  <MaterialIcons 
                    name="add" 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </Pressable>
                <Pressable 
                  style={styles.actionButton}
                  onPress={onClose}
                >
                  <MaterialIcons 
                    name="close" 
                    size={24} 
                    color={theme.colors.text.secondary} 
                  />
                </Pressable>
              </View>
            </View>

            <DraggableFlatList
              data={collection.collection_sounds}
              onDragEnd={({ from, to }) => {
                setIsReordering(false);
                onReorder(from, to);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
              keyExtractor={item => item.sound.id}
              renderItem={renderItem}
            />
          </View>
        </GestureHandlerRootView>
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
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  count: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
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
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  dragging: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
}); 