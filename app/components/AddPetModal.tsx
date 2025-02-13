import { View, Text, StyleSheet, TextInput, Pressable, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { theme } from '../styles/theme';
import { API_CONFIG } from '../constants/config';
import { getSupabase } from '../services/supabase';

interface AddPetModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (pet: { id: string; name: string; type: string }) => void;
}

export default function AddPetModal({ visible, onClose, onAdd }: AddPetModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !type.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/pets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          name: name.trim(),
          type: type.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add pet');
      }

      const newPet = await response.json();
      
      if (!newPet || !newPet.name) {
        throw new Error('Invalid pet data received from server');
      }

      onAdd(newPet);
      setName('');
      setType('');
      onClose();
    } catch (error) {
      console.error('Error adding pet:', error);
      Alert.alert('Error', 'Failed to add pet');
    } finally {
      setLoading(false);
    }
  };

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
        >
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Pet</Text>
              <Pressable onPress={onClose}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pet Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter pet name"
                  placeholderTextColor={theme.colors.text.secondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pet Type</Text>
                <TextInput
                  style={styles.input}
                  value={type}
                  onChangeText={setType}
                  placeholder="e.g., Dog, Cat, Bird"
                  placeholderTextColor={theme.colors.text.secondary}
                />
              </View>
            </View>

            <Pressable 
              style={[
                styles.button, 
                (!name.trim() || !type.trim() || loading) && styles.buttonDisabled
              ]}
              onPress={handleAdd}
              disabled={!name.trim() || !type.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>Add Pet</Text>
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