import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { BlurView } from 'expo-blur';
import { useState } from 'react';

interface FilterOption {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: string[]) => void;
  selectedFilters: string[];
}

const CATEGORIES: FilterOption[] = [
  { id: 'attention', label: 'Attention', icon: 'notifications' },
  { id: 'training', label: 'Training', icon: 'school' },
  { id: 'reward', label: 'Reward', icon: 'stars' },
  { id: 'dogs', label: 'Dogs', icon: 'pets' },
  { id: 'cats', label: 'Cats', icon: 'pets' },
  { id: 'birds', label: 'Birds', icon: 'air' },
];

const getShadow = (size: 'small' | 'medium' | 'large') => {
  if (Platform.OS === 'ios') {
    switch (size) {
      case 'small':
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        };
      case 'medium':
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        };
      case 'large':
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        };
    }
  }
  return {
    elevation: size === 'small' ? 3 : size === 'medium' ? 5 : 8,
  };
};

export default function FilterSheet({ visible, onClose, onApply, selectedFilters }: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<string[]>(selectedFilters);

  if (!visible) return null;

  const toggleFilter = (id: string) => {
    setLocalFilters(prev => 
      prev.includes(id) 
        ? prev.filter(f => f !== id)
        : [...prev, id]
    );
  };

  return (
    <BlurView intensity={95} tint="dark" style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <Pressable 
            style={styles.closeButton} 
            onPress={onClose}
            hitSlop={12}
          >
            <MaterialIcons name="close" size={20} color={theme.colors.text.secondary} />
          </Pressable>
        </View>

        <View style={styles.filterGrid}>
          {CATEGORIES.map(category => (
            <Pressable
              key={category.id}
              style={[
                styles.filterChip,
                localFilters.includes(category.id) && styles.filterChipSelected
              ]}
              onPress={() => toggleFilter(category.id)}
            >
              <MaterialIcons 
                name={category.icon} 
                size={20} 
                color={localFilters.includes(category.id) 
                  ? '#FFF'
                  : theme.colors.text.secondary
                } 
              />
              <Text style={[
                styles.filterLabel,
                localFilters.includes(category.id) && styles.filterLabelSelected
              ]}>
                {category.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <Pressable 
            style={styles.clearButton}
            onPress={() => setLocalFilters([])}
          >
            <Text style={styles.clearButtonText}>Reset</Text>
          </Pressable>
          <Pressable 
            style={styles.applyButton}
            onPress={() => {
              onApply(localFilters);
              onClose();
            }}
          >
            <Text style={styles.applyButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    width: '85%',
    maxWidth: 320,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...getShadow('large'),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
    borderRadius: theme.borderRadius.full,
  },
  filterGrid: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: 'transparent',
  },
  filterLabel: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  filterLabelSelected: {
    color: '#FFF',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  clearButton: {
    padding: theme.spacing.sm,
  },
  clearButtonText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.body.fontSize,
  },
  applyButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  applyButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: theme.typography.body.fontSize,
  },
}); 