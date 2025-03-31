import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { SoundCollection } from '../services/sound';
interface ActiveCollectionProps {
  collection: SoundCollection;
  onPress: () => void;
}

export function ActiveCollection({ collection, onPress }: ActiveCollectionProps) {
  return (
    <Pressable 
      style={styles.container}
      onPress={onPress}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{collection.name}</Text>
        <MaterialIcons 
          name="edit" 
          size={20} 
          color={theme.colors.text.secondary} 
        />
      </View>
      <Text style={styles.count}>
        {collection.collection_sounds.length} sounds
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  count: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
}); 