import React, { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import * as MediaLibrary from 'expo-media-library';
import { mockSounds, Sound } from '../../data/mockSounds';
import SoundSelector from '../../components/SoundSelector';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import LoadingIndicator from '../../components/LoadingIndicator';

const BURST_COUNT = 3;
const BURST_INTERVAL = 1; // 1ms between shots for super quick burst

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, requestAudioPermission] = Audio.usePermissions();
  const [type, setType] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(mockSounds[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBurstMode, setIsBurstMode] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.8);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const handleSoundSelect = async (sound: Sound) => {
    try {
      setSelectedSound(sound);
      setIsPlaying(true);
      await playSound(sound);
      setTimeout(() => setIsPlaying(false), 500);
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play sound');
      setIsPlaying(false);
    }
  };

  const playSound = async (sound: Sound) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound: audioSound } = await Audio.Sound.createAsync(
        sound.uri,
        { volume: soundVolume }
      );
      soundRef.current = audioSound;
      await audioSound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const takeBurstPhotos = async () => {
    if (!cameraRef.current || isBurstMode) return;
    
    setIsBurstMode(true);
    const photos = [];

    try {
      for (let i = 0; i < BURST_COUNT; i++) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          skipProcessing: false,
        });
        
        if (photo) {
          photos.push(photo.uri);
          await MediaLibrary.saveToLibraryAsync(photo.uri);
        }
        
        await new Promise(resolve => setTimeout(resolve, BURST_INTERVAL));
      }

      if (selectedSound) {
        await playSound(selectedSound);
      }

      router.push({
        pathname: '/(authenticated)/photo-selection',
        params: { photos: JSON.stringify(photos) }
      });
    } catch (error) {
      console.error('Error taking burst photos:', error);
      Alert.alert('Error', 'Failed to capture burst photos');
    } finally {
      setIsBurstMode(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync();
      const photos = [photo.uri];
      
      if (selectedSound) {
        await playSound(selectedSound);
      }

      router.push({
        pathname: '/(authenticated)/photo-selection',
        params: { photos: JSON.stringify(photos) }
      });
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  if (!permission?.granted) {
    return <LoadingIndicator message="Requesting camera access..." />;
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={type}
        mode="picture"
      >
        <SoundSelector
          sounds={mockSounds}
          selectedSound={selectedSound}
          onSelectSound={handleSoundSelect}
          isPlaying={isPlaying}
        />

        <View style={styles.controls}>
          <Pressable
            style={styles.controlButton}
            onPress={() => setType(current => (
              current === 'back' ? 'front' : 'back'
            ))}
          >
            <MaterialIcons
              name="flip-camera-ios"
              size={32}
              color={theme.colors.text.inverse}
            />
          </Pressable>

          <Pressable
            style={[
              styles.captureButton,
              isBurstMode && styles.captureButtonActive,
            ]}
            onPress={isBurstMode ? takeBurstPhotos : takePicture}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>

          <Pressable
            style={styles.controlButton}
            onPress={() => setIsBurstMode(!isBurstMode)}
          >
            <MaterialIcons
              name="burst-mode"
              size={32}
              color={theme.colors.text.inverse}
            />
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: theme.spacing.xl,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.text.inverse,
  },
  text: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    alignSelf: 'center',
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
  },
  captureButtonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
});