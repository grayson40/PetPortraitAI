import { View, Text, StyleSheet, TextInput, Pressable, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { theme } from '../styles/theme';
import { API_CONFIG } from '../constants/config';
import { getSupabase } from '../services/supabase';

interface Sound {
  id: string;
  name: string;
  url: string;
  category: string;
  description: string;
  created_at: string;
}

interface CreateCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (collection: { id: string; name: string; sounds: Array<{
    sound_id: string;
    sound_type: 'default' | 'marketplace' | 'user';
    order_index: number;
    sound: Sound;
  }> }) => void;
  defaultSounds: Sound[];
}

export default function CreateCollectionModal({ visible, onClose, onAdd, defaultSounds }: CreateCollectionModalProps) {
  const [name, setName] = useState('');
  const [selectedSounds, setSelectedSounds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const soundsToAdd = Array.from(selectedSounds).map((soundId, index) => ({
        sound_id: soundId,
        sound_type: 'default' as const,
        order_index: index,
        sound: defaultSounds.find(s => s.id === soundId)!
      }));

      const response = await fetch(`${API_CONFIG.url}/sounds/collections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          name: name.trim(),
          sounds: soundsToAdd,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create collection');
      }

      const newCollection = await response.json();
      onAdd(newCollection);
      setName('');
      setSelectedSounds(new Set());
      onClose();
    } catch (error) {
      console.error('Error creating collection:', error);
      Alert.alert('Error', 'Failed to create collection');
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
              <Text style={styles.modalTitle}>New Collection</Text>
              <Pressable onPress={onClose}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Collection Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter collection name"
                  placeholderTextColor={theme.colors.text.secondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Add Sounds</Text>
                <TextInput
                  style={styles.input}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search sounds..."
                  placeholderTextColor={theme.colors.text.secondary}
                />
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
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Pressable 
              style={[
                styles.button, 
                (!name.trim() || loading) && styles.buttonDisabled
              ]}
              onPress={handleAdd}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Create Collection</Text>
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
  inputGroup: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
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