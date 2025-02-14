import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../styles/theme';

interface ActiveCollectionProps {
  name: string;
  soundCount: number;
}

export function ActiveCollection({ name, soundCount }: ActiveCollectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <MaterialIcons 
          name="volume-up" 
          size={24} 
          color={theme.colors.primary} 
        />
        <Text style={styles.name}>{name}</Text>
      </View>
      <Text style={styles.count}>
        {soundCount} {soundCount === 1 ? 'sound' : 'sounds'}
      </Text>
    </View>
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
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  count: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
}); 