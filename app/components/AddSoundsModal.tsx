import { View, Text, StyleSheet, TextInput, Pressable, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { theme } from '../styles/theme';
import { API_CONFIG } from '../constants/config';
import { getSupabase } from '../services/supabase';
import { SoundService } from '../services/sound';

interface Sound {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  created_at: string;
}

interface AddSoundsModalProps {
  visible: boolean;
  onClose: () => void;
  collectionId: string;
  defaultSounds: Sound[];
  existingSounds: string[]; // Array of sound IDs already in collection
  onAdd: () => void;
  onRemove: (soundIds: string[]) => Promise<void>;
}

export default function AddSoundsModal({ 
  visible, 
  onClose, 
  collectionId, 
  defaultSounds,
  existingSounds = [],
  onAdd,
  onRemove,
}: AddSoundsModalProps) {
  const [selectedSounds, setSelectedSounds] = useState<Set<string>>(() => new Set(existingSounds));
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSave = async () => {
    setLoading(true);
    try {
      // Find sounds to add and remove
      const soundsToAdd = Array.from(selectedSounds)
        .filter(id => !existingSounds.includes(id));
      const soundsToRemove = existingSounds
        .filter(id => !selectedSounds.has(id));

      if (soundsToAdd.length > 0) {
        const soundService = SoundService.getInstance();
        await soundService.addSoundsToCollection(collectionId, soundsToAdd.map((soundId, index) => ({
          sound_id: soundId,
          sound_type: 'default',
          order_index: existingSounds.length + index,
        })));
      }

      if (soundsToRemove.length > 0) {
        await onRemove(soundsToRemove);
      }

      onAdd(); // Refresh the collections
      onClose();
    } catch (error) {
      console.error('Error updating sounds:', error);
      Alert.alert('Error', 'Failed to update sounds');
    } finally {
      setLoading(false);
    }
  };

  const toggleSound = (soundId: string) => {
    setSelectedSounds(prev => {
      const next = new Set(prev);
      if (next.has(soundId)) {
        next.delete(soundId);
      } else {
        next.add(soundId);
      }
      return next;
    });
  };

  const filteredSounds = defaultSounds.filter(sound => 
    sound.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sound.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasChanges = () => {
    const added = Array.from(selectedSounds).some(id => !existingSounds.includes(id));
    const removed = existingSounds.some(id => !selectedSounds.has(id));
    return added || removed;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Sounds</Text>
              <Pressable onPress={onClose}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color={theme.colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search sounds..."
                placeholderTextColor={theme.colors.text.secondary}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="clear" size={20} color={theme.colors.text.secondary} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView style={styles.soundsList}>
              {filteredSounds.map(sound => (
                <Pressable
                  key={sound.id}
                  style={[
                    styles.soundItem,
                    selectedSounds.has(sound.id) && styles.soundItemSelected
                  ]}
                  onPress={() => toggleSound(sound.id)}
                >
                  <MaterialIcons 
                    name={selectedSounds.has(sound.id) ? "check-box" : "check-box-outline-blank"} 
                    size={24} 
                    color={selectedSounds.has(sound.id) ? theme.colors.primary : theme.colors.text.secondary} 
                  />
                  <View style={styles.soundInfo}>
                    <Text style={styles.soundName}>{sound.name}</Text>
                    <Text style={styles.soundCategory}>{sound.category}</Text>
                  </View>
                  <Pressable 
                    style={styles.playButton}
                    onPress={() => {/* TODO: Add preview functionality */}}
                  >
                    <MaterialIcons name="play-arrow" size={20} color={theme.colors.primary} />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable 
              style={[
                styles.button, 
                (!hasChanges() || loading) && styles.buttonDisabled
              ]}
              onPress={handleSave}
              disabled={!hasChanges() || loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Save Changes</Text>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    width: '100%',
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  soundsList: {
    maxHeight: 400,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  soundItemSelected: {
    backgroundColor: theme.colors.primary + '10',
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  soundCategory: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    textTransform: 'capitalize',
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    padding: theme.spacing.xs,
  },
  playButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary + '10',
  },
}); 