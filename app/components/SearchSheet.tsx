import { View, StyleSheet, TextInput, Pressable, Text, FlatList, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { BlurView } from 'expo-blur';
import { useState, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SearchSheetProps {
  visible: boolean;
  onClose: () => void;
  onSoundSelect: (sound: any) => void;
}

type SoundCategory = 'all' | 'attention' | 'training' | 'food';

export default function SearchSheet({ visible, onClose, onSoundSelect }: SearchSheetProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SoundCategory>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }).start(() => {
        inputRef.current?.focus();
      });
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        mass: 1,
        stiffness: 100,
      }).start();
    }
  }, [visible]);

  const handleSearch = (text: string) => {
    setQuery(text);
    // Implement sound search logic here
  };

  const FilterChip = ({ type, label }: { type: SoundCategory; label: string }) => (
    <Pressable
      style={[styles.filterChip, activeFilter === type && styles.activeFilterChip]}
      onPress={() => setActiveFilter(type)}
    >
      <MaterialIcons 
        name={
          type === 'attention' ? 'notifications' :
          type === 'training' ? 'pets' :
          type === 'food' ? 'restaurant' : 'music-note'
        }
        size={16}
        color={activeFilter === type ? theme.colors.text.inverse : theme.colors.text.secondary}
      />
      <Text style={[
        styles.filterChipText,
        activeFilter === type && styles.activeFilterChipText
      ]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-800, 0],
            })
          }],
          opacity: slideAnim,
          paddingTop: insets.top,
        },
        !visible && styles.hidden,
      ]}
    >
      <BlurView intensity={80} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={theme.colors.text.secondary} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search sounds..."
            value={query}
            onChangeText={handleSearch}
            placeholderTextColor={theme.colors.text.secondary}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={20} color={theme.colors.text.secondary} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={onClose} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        <FilterChip type="all" label="All Sounds" />
        <FilterChip type="attention" label="Attention" />
        <FilterChip type="training" label="Training" />
        <FilterChip type="food" label="Food" />
      </View>

      {query.length === 0 && (
        <View style={styles.recentSearches}>
          <Text style={styles.sectionTitle}>Recent Sounds</Text>
          {recentSearches.map((search, index) => (
            <Pressable 
              key={index}
              style={styles.recentSearchItem}
              onPress={() => setQuery(search)}
            >
              <MaterialIcons name="history" size={20} color={theme.colors.text.secondary} />
              <Text style={styles.recentSearchText}>{search}</Text>
              <MaterialIcons 
                name="play-arrow" 
                size={20} 
                color={theme.colors.text.secondary}
                style={styles.playIcon}
              />
            </Pressable>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    zIndex: 1000,
  },
  hidden: {
    display: 'none',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    padding: 0,
  },
  cancelButton: {
    paddingVertical: theme.spacing.xs,
  },
  cancelText: {
    color: theme.colors.primary,
    fontSize: theme.typography.body.fontSize,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
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
  activeFilterChip: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  activeFilterChipText: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  recentSearches: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  recentSearchText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  playIcon: {
    marginLeft: 'auto',
  },
}); 