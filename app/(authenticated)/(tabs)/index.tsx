import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  Pressable, 
  Dimensions,
  Animated,
  RefreshControl,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { mockPhotos, Photo } from '../../data/mockPhotos';
import { router } from 'expo-router';
import { useState, useRef, useEffect, useMemo } from 'react';
import { BlurView } from 'expo-blur';
import LoadingIndicator from '../../components/LoadingIndicator';
import SearchBar, { SearchFilter } from '../../components/SearchBar';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = width / 2 - theme.spacing.lg;

type PhotoFilter = 'all' | 'trending' | 'recent' | 'following' | 'popular' | 'nearby';

export default function Feed() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PhotoFilter>('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 1000);
  }, []);

  const handlePhotoPress = (photo: Photo) => {
    router.push(`/(authenticated)/photo/${photo.id}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // TODO: Implement actual refresh logic
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const FilterButton = ({ filter, label }: { filter: PhotoFilter; label: string }) => (
    <Pressable
      style={[
        styles.filterButton,
        activeFilter === filter && styles.filterButtonActive
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text
        style={[
          styles.filterText,
          activeFilter === filter && styles.filterTextActive
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const filteredPhotos = useMemo(() => {
    if (!searchQuery) return mockPhotos;

    return mockPhotos.filter(photo => {
      const query = searchQuery.toLowerCase();
      
      switch (searchFilter) {
        case 'pets':
          return photo.petName?.toLowerCase().includes(query);
        case 'people':
          return photo.photographerName.toLowerCase().includes(query);
        case 'places':
          // Add location data to photos and filter by it
          return false;
        case 'all':
        default:
          return (
            photo.petName?.toLowerCase().includes(query) ||
            photo.photographerName.toLowerCase().includes(query)
            // Add more searchable fields here
          );
      }
    });
  }, [searchQuery, searchFilter, mockPhotos]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Discover</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <FilterButton filter="all" label="All" />
        <FilterButton filter="trending" label="Trending" />
        <FilterButton filter="recent" label="Recent" />
        <FilterButton filter="following" label="Following" />
      </ScrollView>
    </View>
  );

  const renderPhoto = ({ item }: { item: Photo }) => (
    <Animated.View style={[styles.photoContainer, { opacity: fadeAnim }]}>
      <Pressable onPress={() => handlePhotoPress(item)}>
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.photo}
          resizeMode="cover"
        />
        <BlurView intensity={80} style={styles.photoInfo}>
          <View style={styles.photoHeader}>
            <Text style={styles.petName}>{item.petName}</Text>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.photoFooter}>
            <Pressable 
              style={styles.likeButton}
              onPress={(e) => {
                e.stopPropagation();
                // TODO: Implement like functionality
              }}
            >
              <MaterialIcons 
                name="favorite-border" 
                size={20} 
                color={theme.colors.text.inverse} 
              />
              <Text style={styles.likeCount}>{item.likes}</Text>
            </Pressable>
            <Pressable 
              style={styles.photographerButton}
              onPress={(e) => {
                e.stopPropagation();
                // TODO: Navigate to photographer profile
              }}
            >
              <MaterialIcons 
                name="person" 
                size={16} 
                color={theme.colors.text.inverse} 
              />
              <Text style={styles.photographerName}>
                {item.photographerName}
              </Text>
            </Pressable>
          </View>
        </BlurView>
      </Pressable>
    </Animated.View>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.headerBackground, { opacity: headerOpacity }]}>
        <BlurView intensity={80} style={StyleSheet.absoluteFill} />
      </Animated.View>
      
      <FlatList
        data={filteredPhotos}
        renderItem={renderPhoto}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        stickyHeaderIndices={[0]}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: theme.colors.background,
    zIndex: 1,
  },
  header: {
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  filters: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  filterButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  filterTextActive: {
    color: theme.colors.text.inverse,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: theme.spacing.md,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  photoContainer: {
    width: PHOTO_SIZE,
    aspectRatio: 1,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surface,
  },
  photoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.sm,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  petName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  date: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.inverse,
    opacity: 0.8,
  },
  photoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  likeCount: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.inverse,
  },
  photographerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  photographerName: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.inverse,
    opacity: 0.8,
  },
}); 