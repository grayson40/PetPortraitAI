import { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Animated, 
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const FEATURES = [
  {
    icon: 'camera',
    title: 'Smart Pet Camera',
    description: 'AI-powered camera that captures the perfect moment',
    color: '#4CAF50',
  },
  {
    icon: 'music-note',
    title: 'Attention Sounds',
    description: 'Curated sounds to grab your pet\'s attention',
    color: '#2196F3',
  },
  {
    icon: 'collections',
    title: 'Sound Collections',
    description: 'Organize and customize your sound library',
    color: '#9C27B0',
  }
];

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideRef = useRef(null);

  const handleComplete = async () => {
    try {
      // Clear the onboarding flag
      await AsyncStorage.removeItem('needsOnboarding');
      
      // Navigate to main app
      router.replace('/(authenticated)/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const renderFeature = ({ item, index }) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.5, 1, 0.5],
    });

    return (
      <Animated.View 
        style={[
          styles.featureContainer,
          { transform: [{ scale }], opacity }
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color + '10' }]}>
          <MaterialIcons name={item.icon} size={64} color={item.color} />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </Animated.View>
    );
  };

  const renderIndicator = (index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const backgroundColor = scrollX.interpolate({
      inputRange,
      outputRange: [theme.colors.border, theme.colors.primary, theme.colors.border],
    });

    const scaleX = scrollX.interpolate({
      inputRange,
      outputRange: [1, 2.5, 1], // Instead of changing width, we'll scale
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.indicator,
          {
            backgroundColor,
            transform: [{ scaleX }],
          }
        ]}
      />
    );
  };

  const isLastSlide = currentIndex === FEATURES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.FlatList
        ref={slideRef}
        data={FEATURES}
        renderItem={renderFeature}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
            Haptics.selectionAsync();
          }
        }}
      />

      <View style={styles.footer}>
        <View style={styles.indicators}>
          {FEATURES.map((_, index) => renderIndicator(index))}
        </View>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={styles.button}
            onPress={handleComplete}
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  featureContainer: {
    width,
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    maxWidth: '80%',
  },
  footer: {
    padding: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  indicator: {
    height: 8,
    width: 8, // Base width
    borderRadius: 4,
    marginHorizontal: theme.spacing.xs,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
}); 