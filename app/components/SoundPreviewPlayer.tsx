import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { theme } from '../styles/theme';
import { BlurView } from 'expo-blur';
import { Sound } from '../data/mockSounds';

interface SoundPreviewPlayerProps {
  sound: Sound | null;
  onClose: () => void;
  onPlayPause: () => void;
  isPlaying: boolean;
}

export default function SoundPreviewPlayer({
  sound,
  onClose,
  onPlayPause,
  isPlaying,
}: SoundPreviewPlayerProps) {
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (sound) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [sound]);

  const getCategoryIcon = (category: string): keyof typeof MaterialIcons.glyphMap => {
    switch (category) {
      case 'attention': return 'notifications';
      case 'training': return 'school';
      case 'reward': return 'stars';
      default: return 'music-note';
    }
  };

  if (!sound) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] }
      ]}
    >
      <BlurView intensity={30} style={styles.content}>
        <View style={styles.soundInfo}>
          <MaterialIcons 
            name={getCategoryIcon(sound.category)} 
            size={24} 
            color={theme.colors.primary} 
          />
          <Text style={styles.soundName}>{sound.name}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable onPress={onPlayPause}>
            <MaterialIcons 
              name={isPlaying ? 'pause' : 'play-arrow'} 
              size={32} 
              color={theme.colors.primary} 
            />
          </Pressable>
          <Pressable onPress={onClose}>
            <MaterialIcons name="close" size={24} color={theme.colors.text.secondary} />
          </Pressable>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background + '80',
    borderRadius: theme.borderRadius.lg,
  },
  soundInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  soundName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
}); 