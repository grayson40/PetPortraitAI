import { View, Text, StyleSheet, Pressable, Modal, FlatList, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { mockPhotos, Photo } from '../data/mockPhotos';
import { router } from 'expo-router';
import { Fragment } from 'react';

interface PetDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  pet: {
    id: string;
    name: string;
    type: string;
  };
  onDelete: () => void;
  onEdit: () => void;
}

export default function PetDetailsModal({ 
  visible, 
  onClose, 
  pet, 
  onDelete, 
  onEdit 
}: PetDetailsModalProps) {
  if (!pet) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="pets" size={24} color={theme.colors.primary} />
              <View>
                <Text style={styles.petName}>{pet.name}</Text>
                <Text style={styles.petType}>{pet.type}</Text>
              </View>
            </View>
            <Pressable onPress={onClose}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.actionButton} onPress={onEdit}>
              <MaterialIcons name="edit" size={20} color={theme.colors.primary} />
              <Text style={styles.actionText}>Edit Pet</Text>
            </Pressable>

            <Pressable 
              style={[styles.actionButton, styles.deleteButton]} 
              onPress={onDelete}
            >
              <MaterialIcons name="delete" size={20} color={theme.colors.error} />
              <Text style={[styles.actionText, styles.deleteText]}>Remove Pet</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    maxHeight: '85%',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  petName: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
  },
  petType: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  stats: {
    flexDirection: 'row',
    gap: theme.spacing.xl,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  sectionTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  photosGrid: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  photoContainer: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
  },
  actions: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  actionText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.md,
  },
  deleteText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.error,
    fontWeight: '600',
  },
}); 