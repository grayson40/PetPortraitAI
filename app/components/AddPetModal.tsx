import { View, Text, StyleSheet, TextInput, Pressable, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { theme } from '../styles/theme';

interface AddPetModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (petData: { name: string; type: string }) => Promise<void>;
  loading?: boolean;
  initialData?: {
    name: string;
    type: string;
  };
  isEdit?: boolean;
}

const PET_TYPES = [
  { id: 'dog', label: 'Dog', icon: 'pets' },
  { id: 'cat', label: 'Cat', icon: 'pets' },
  { id: 'horse', label: 'Horse', icon: 'pets' },
  { id: 'bird', label: 'Bird', icon: 'flutter-dash' },
] as const;

export default function AddPetModal({ 
  visible, 
  onClose, 
  onAdd, 
  loading = false,
  initialData,
  isEdit = false 
}: AddPetModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [selectedType, setSelectedType] = useState<string>(initialData?.type || '');

  const handleTypeSelect = (typeId: string) => {
    if (selectedType === typeId) {
      setSelectedType(''); // Deselect if already selected
    } else {
      setSelectedType(typeId); // Select new type
    }
  };

  const handleAdd = async () => {
    if (!name.trim() || !selectedType) return;

    try {
      await onAdd({
        name: name.trim(),
        type: selectedType,
      });
      setName('');
      setSelectedType('');
      onClose();
    } catch (error) {
      // Error handling is done by parent
      console.error('Error in AddPetModal:', error);
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
              <Text style={styles.modalTitle}>{isEdit ? 'Edit Pet' : 'Add Pet'}</Text>
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
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.petTypeScroll}
                >
                  {PET_TYPES.map((type) => (
                    <Pressable
                      key={type.id}
                      style={[
                        styles.petTypeButton,
                        selectedType === type.id && styles.petTypeButtonSelected
                      ]}
                      onPress={() => handleTypeSelect(type.id)}
                    >
                      <MaterialIcons 
                        name={type.icon as keyof typeof MaterialIcons.glyphMap}
                        size={24}
                        color={selectedType === type.id ? theme.colors.primary : theme.colors.text.secondary}
                      />
                      <Text style={[
                        styles.petTypeText,
                        selectedType === type.id && styles.petTypeTextSelected
                      ]}>
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            <Pressable 
              style={[
                styles.button, 
                (!name.trim() || !selectedType || loading) && styles.buttonDisabled
              ]}
              onPress={handleAdd}
              disabled={!name.trim() || !selectedType || loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.text.inverse} />
              ) : (
                <Text style={styles.buttonText}>
                  {isEdit ? 'Save Changes' : 'Add Pet'}
                </Text>
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
  petTypeScroll: {
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  petTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  petTypeButtonSelected: {
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary,
  },
  petTypeText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  petTypeTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
}); 