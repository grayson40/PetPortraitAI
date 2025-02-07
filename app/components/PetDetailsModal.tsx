import { View, Text, StyleSheet, Pressable, Modal, FlatList, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { mockPhotos, Photo } from '../data/mockPhotos';
import { router } from 'expo-router';
import { Fragment } from 'react';

interface PetDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  pet: {
    name: string;
    type: string;
  };
  onDelete?: () => void;
}

export default function PetDetailsModal({ visible, onClose, pet, onDelete }: PetDetailsModalProps) {
  // Add early return if pet is null
  if (!pet) return null;

  // Mock filtering photos by pet name
  const petPhotos = mockPhotos.filter(photo => photo.petName === pet.name);

  const renderPhoto = ({ item }: { item: Photo }) => (
    <Pressable 
      style={styles.photoContainer}
      onPress={() => {
        onClose();
        router.push(`/(authenticated)/photo/${item.id}`);
      }}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.photo}
        resizeMode="cover"
      />
    </Pressable>
  );

  const ListHeader = () => (
    <Fragment>
      <View style={styles.dragIndicator} />
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

      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{petPhotos.length}</Text>
          <Text style={styles.statLabel}>Photos</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {petPhotos.reduce((acc, photo) => acc + photo.likes, 0)}
          </Text>
          <Text style={styles.statLabel}>Likes</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Photos</Text>
    </Fragment>
  );

  const ListFooter = () => (
    onDelete ? (
      <Pressable 
        style={styles.deleteButton}
        onPress={onDelete}
      >
        <MaterialIcons name="delete" size={20} color={theme.colors.error} />
        <Text style={styles.deleteText}>Remove Pet</Text>
      </Pressable>
    ) : null
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable 
        style={styles.modalOverlay}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Pressable 
            style={styles.modalContent} 
            onPress={e => e.stopPropagation()}
          >
            <FlatList
              data={petPhotos}
              renderItem={renderPhoto}
              keyExtractor={item => item.id}
              numColumns={3}
              contentContainerStyle={styles.photosGrid}
              ListHeaderComponent={ListHeader}
              ListFooterComponent={ListFooter}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialIcons name="photo-library" size={48} color={theme.colors.text.secondary} />
                  <Text style={styles.emptyText}>No photos yet</Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
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
    margin: 0,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    maxHeight: '85%',
    width: '100%',
    margin: 0,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
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
    marginBottom: theme.spacing.lg,
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
    marginBottom: theme.spacing.md,
  },
  photosGrid: {
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  deleteText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.error,
  },
  keyboardView: {
    width: '100%',
    margin: 0,
  },
}); 