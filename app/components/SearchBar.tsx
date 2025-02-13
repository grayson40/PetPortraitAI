import { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { BlurView } from 'expo-blur';

interface SearchBarProps {
  onSearch: (query: string, filter: SearchFilter) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export type SearchFilter = 'all' | 'pets' | 'people' | 'places';

export default function SearchBar({ onSearch, onFocus, onBlur }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (text: string) => {
    setQuery(text);
    onSearch(text, filter);
  };

  const FilterChip = ({ type, label }: { type: SearchFilter; label: string }) => (
    <Pressable
      style={[
        styles.filterChip,
        filter === type && styles.filterChipActive
      ]}
      onPress={() => {
        setFilter(type);
        onSearch(query, type);
      }}
    >
      <MaterialIcons 
        name={
          type === 'pets' ? 'pets' :
          type === 'people' ? 'person' :
          type === 'places' ? 'place' : 'search'
        } 
        size={16} 
        color={filter === type ? theme.colors.text.inverse : theme.colors.text.secondary} 
      />
      <Text style={[
        styles.filterChipText,
        filter === type && styles.filterChipTextActive
      ]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Animated.View style={styles.container}>
      <BlurView intensity={20} style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <MaterialIcons 
            name="search" 
            size={20} 
            color={theme.colors.text.secondary} 
          />
          <TextInput
            style={styles.input}
            placeholder="Search sounds..."
            value={query}
            onChangeText={handleSearch}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            placeholderTextColor={theme.colors.text.secondary}
          />
          {query.length > 0 && (
            <Pressable 
              onPress={() => handleSearch('')}
              style={styles.clearButton}
            >
              <MaterialIcons 
                name="close" 
                size={20} 
                color={theme.colors.text.secondary} 
              />
            </Pressable>
          )}
        </View>

        <View style={styles.filtersContainer}>
          <FilterChip type="all" label="All" />
          <FilterChip type="pets" label="Pets" />
          <FilterChip type="people" label="People" />
          <FilterChip type="places" label="Places" />
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  searchContainer: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    padding: 0,
  },
  clearButton: {
    padding: theme.spacing.xs,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  filterChipTextActive: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
}); 