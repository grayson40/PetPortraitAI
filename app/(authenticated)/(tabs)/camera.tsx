import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import * as MediaLibrary from 'expo-media-library';
import { mockSounds, Sound } from '../../data/mockSounds';
import SoundSelector from '../../components/SoundSelector';
import { soundService } from '../../services/sound';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(mockSounds[0]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    soundService.initialize();

    mockSounds.forEach(sound => {
      soundService.loadSound(sound).catch(error => {
        console.error('Error loading sound:', error);
      });
    });

    return () => {
      soundService.cleanup();
    };
  }, []);

  const handleSoundSelect = async (sound: Sound) => {
    try {
      setSelectedSound(sound);
      setIsPlaying(true);
      await soundService.playSound(sound.id);
      setTimeout(() => setIsPlaying(false), 500);
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play sound');
      setIsPlaying(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (!photo) {
        throw new Error('Photo is undefined');
      }
      await MediaLibrary.saveToLibraryAsync(photo.uri);
      Alert.alert('Success', 'Photo saved to gallery!');
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to use the camera</Text>
        <Pressable
          style={styles.button}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
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
            style={styles.captureButton}
            onPress={takePicture}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>

          <Pressable
            style={styles.controlButton}
            onPress={() => {
              if (selectedSound) {
                soundService.playSound(selectedSound.id);
              }
            }}
          >
            <MaterialIcons
              name="pets"
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
}); 