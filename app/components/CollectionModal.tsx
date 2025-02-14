import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { theme } from '../styles/theme';
import * as Haptics from 'expo-haptics';

interface CollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  collection: {
    id: string;
    name: string;
    description: string;
    soundCount: number;
    sounds?: Sound[];
  } | null;
  isPremium: boolean;
}

interface Sound {
  id: string;
  name: string;
  category: string;
  isPremium: boolean;
}

export default function CollectionModal({ 
  visible, 
  onClose, 
  onSave,
  collection,
  isPremium 
}: CollectionModalProps) {
  if (!collection) return null;

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
                  style={styles.soundItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={styles.soundInfo}>
                    <MaterialIcons 
                      name="music-note" 
                      size={24} 
                      color={theme.colors.primary} 
                    />
                    <Text style={styles.soundName}>{sound.name}</Text>
                  </View>
                  <MaterialIcons 
                    name="play-arrow" 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyText}>No sounds in this collection</Text>
            )}
          </ScrollView>

          {/* Save Button */}
          <Pressable 
            style={styles.saveButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSave();
            }}
          >
            <Text style={styles.saveText}>Save Collection</Text>
          </Pressable>
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
}); 