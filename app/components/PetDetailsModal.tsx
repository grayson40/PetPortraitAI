import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useState, useEffect } from 'react';

interface Pet {
  id: string;
  name: string;
  type: string;
}

interface PetDetailsModalProps {
  visible: boolean;
  pet: Pet | null;
  onClose: () => void;
  onDelete: (petId: string) => void;
  onEdit: (pet: Pet) => void;
}

const PET_TYPES = [
  { id: 'dog', label: 'Dog', icon: 'pets' },
  { id: 'cat', label: 'Cat', icon: 'pets' },
  { id: 'horse', label: 'Horse', icon: 'pets' },
  { id: 'bird', label: 'Bird', icon: 'flutter-dash' },
] as const;

export default function PetDetailsModal({ visible, pet, onClose, onDelete, onEdit }: PetDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Pet | null>(null);

  // Reset edit state when modal closes
  useEffect(() => {
    if (!visible) {
      setIsEditing(false);
      setEditForm(null);
    }
  }, [visible]);

  if (!pet) return null;

  const handleStartEdit = () => {
    setEditForm(pet);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editForm) {
      onEdit(editForm);
      setIsEditing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.dragIndicator} />
          
          <ScrollView 
            style={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.petIcon}>
                <MaterialIcons name="pets" size={32} color={theme.colors.text.inverse} />
              </View>
              <View style={styles.petInfo}>
                {isEditing ? (
                  <View>
                    <TextInput
                      style={styles.input}
                      value={editForm?.name}
                      onChangeText={(text) => setEditForm(prev => prev ? {...prev, name: text} : null)}
                      placeholder="Pet name"
                      placeholderTextColor={theme.colors.text.secondary}
                      autoFocus
                    />
                    <View style={styles.petTypeSelector}>
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
                              editForm?.type === type.id && styles.petTypeButtonSelected
                            ]}
                            onPress={() => setEditForm(prev => prev ? {...prev, type: type.id} : null)}
                          >
                            <MaterialIcons 
                              name={type.icon as keyof typeof MaterialIcons.glyphMap}
                              size={24}
                              color={editForm?.type === type.id ? theme.colors.primary : theme.colors.text.secondary}
                            />
                            <Text style={[
                              styles.petTypeText,
                              editForm?.type === type.id && styles.petTypeTextSelected
                            ]}>
                              {type.label}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <Text style={styles.petType}>{pet.type}</Text>
                  </>
                )}
              </View>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <MaterialIcons name="close" size={24} color={theme.colors.text.secondary} />
              </Pressable>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {isEditing ? (
                <>
                  <Pressable 
                    style={[styles.actionButton, styles.saveButton]} 
                    onPress={handleSave}
                  >
                    <MaterialIcons name="check" size={20} color={theme.colors.primary} />
                    <Text style={[styles.actionText, { color: theme.colors.primary }]}>Save Changes</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setIsEditing(false)}
                  >
                    <MaterialIcons name="close" size={20} color={theme.colors.text.secondary} />
                    <Text style={[styles.actionText, { color: theme.colors.text.secondary }]}>Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable 
                    style={[styles.actionButton, styles.editButton]} 
                    onPress={handleStartEdit}
                  >
                    <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
                    <Text style={[styles.actionText, { color: theme.colors.primary }]}>Edit Pet</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => onDelete(pet.id)}
                  >
                    <MaterialIcons name="delete" size={20} color={theme.colors.error} />
                    <Text style={[styles.actionText, { color: theme.colors.error }]}>Remove Pet</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: theme.spacing.sm,
  },
  content: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  petIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  petType: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  editButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  deleteButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  saveButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 44,
  },
  petTypeSelector: {
    marginTop: theme.spacing.xs,
  },
  petTypeScroll: {
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