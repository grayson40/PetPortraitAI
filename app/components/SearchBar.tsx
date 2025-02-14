import { View, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface SearchBarProps {
  onSearchPress: () => void;
  onFilter: () => void;
  hasActiveFilters?: boolean;
}

export default function SearchBar({ onSearchPress, onFilter, hasActiveFilters }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Pressable 
        style={[
          styles.filterButton,
          hasActiveFilters && styles.filterButtonActive
        ]}
        onPress={onFilter}
      >
        <MaterialIcons 
          name="tune" 
          size={20} 
          color={hasActiveFilters ? theme.colors.primary : theme.colors.text.secondary} 
        />
      </Pressable>

      <Pressable 
        style={styles.searchButton}
        onPress={onSearchPress}
      >
        <MaterialIcons name="search" size={24} color={theme.colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginRight: theme.spacing.md,
  },
  filterButton: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary + '10',
  },
  searchButton: {
    padding: theme.spacing.sm,
  },
}); 