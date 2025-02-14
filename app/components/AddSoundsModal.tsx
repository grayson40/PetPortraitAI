import { View, Text, StyleSheet, TextInput, Pressable, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { theme } from '../styles/theme';

interface Sound {
  id: string;
  name: string;
  url?: string;
  category: string;
  isPremium: boolean;
}

interface AddSoundsModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (selectedSounds: string[]) => void;
  sounds: Sound[];
  existingSoundIds: string[];
}

export default function AddSoundsModal({ 
  visible, 
  onClose, 
  onAdd, 
  sounds,
  existingSoundIds 
}: AddSoundsModalProps) {
  const [selectedSounds, setSelectedSounds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = async () => {
    if (selectedSounds.size === 0) return;
    setLoading(true);
    try {
      await onAdd(Array.from(selectedSounds));
      setSelectedSounds(new Set());
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Error adding sounds:', error);
      Alert.alert('Error', 'Failed to add sounds');
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

  const filteredSounds = sounds.filter(sound => 
    !existingSoundIds.includes(sound.id) &&
    (sound.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sound.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Sounds</Text>
              <Pressable onPress={onClose}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search sounds..."
                placeholderTextColor={theme.colors.text.secondary}
              />

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
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Pressable 
              style={[
                styles.button, 
                (selectedSounds.size === 0 || loading) && styles.buttonDisabled
              ]}
              onPress={handleAdd}
              disabled={selectedSounds.size === 0 || loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Add Selected Sounds</Text>
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
  form: {
    gap: theme.spacing.lg,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  soundsList: {
    maxHeight: 300,
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
}); 