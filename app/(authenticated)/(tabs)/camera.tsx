import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import * as MediaLibrary from 'expo-media-library';
import { mockSounds, Sound } from '../../data/mockSounds';
import SoundSelector from '../../components/SoundSelector';
import FaceDetection, { Face } from '@react-native-ml-kit/face-detection';
import { router } from 'expo-router';
import { getSupabase } from '../../services/supabase';
import { API_CONFIG } from '../../constants/config';
import { Audio } from 'expo-av';

const BURST_COUNT = 3;
const BURST_INTERVAL = 1; // 10ms between shots for super quick burst

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [audioPermission, requestAudioPermission] = Audio.usePermissions();
  const [type, setType] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(mockSounds[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFaceDetecting, setIsFaceDetecting] = useState(true);
  const [isBurstMode, setIsBurstMode] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<Face[]>([]);
  const [availableSounds, setAvailableSounds] = useState<Sound[]>([]);
  const [activeSound, setActiveSound] = useState<Sound | null>(null);
  const [soundVolume, setSoundVolume] = useState(0.8);
  const [isPerfectShot, setIsPerfectShot] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await soundService.initialize();

        await Promise.all(mockSounds.map(sound => 
          soundService.loadSound(sound)
        ));
      } catch (error) {
        console.error('Sound initialization error:', error);
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    loadSounds();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const loadSounds = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/sounds/collections`);
      const data = await response.json();
      setAvailableSounds(data.sounds || []);
    } catch (error) {
      console.error('Error loading sounds:', error);
      Alert.alert('Error', 'Failed to load attention sounds');
    }
  };

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
        { uri: sound.url },
        { volume: soundVolume }
      );
      soundRef.current = audioSound;
      await audioSound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const processFaces = async (photo: { uri: string }) => {
    try {
      const faces = await FaceDetection.process(photo.uri, {
        landmarkMode: FaceDetection.FaceLandmarkMode.NONE, // Minimal processing for speed
        performanceMode: FaceDetection.FaceDetectorPerformanceMode.FAST,
      });
      
      setDetectedFaces(faces);
      
      // Immediately take burst photos if any face is detected
      if (faces.length > 0) {
        takeBurstPhotos();
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }
  };

  const startFaceDetection = async () => {
    if (!cameraRef.current || isBurstMode) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });
      
      await processFaces(photo);
    } catch (error) {
      console.error('Error in face detection:', error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isFaceDetecting && !isBurstMode) {
      interval = setInterval(startFaceDetection, 100); // Check more frequently
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isFaceDetecting, isBurstMode]);

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

      // Navigate to photo selection screen with the photos
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

  const toggleFaceDetection = () => {
    setIsFaceDetecting(!isFaceDetecting);
  };

  const handleFacesDetected = ({ faces }: { faces: Face[] }) => {
    setDetectedFaces(faces);
    const hasPerfectShot = analyzePetShot(faces);
    setIsPerfectShot(hasPerfectShot);
  };

  const analyzePetShot = (faces: Face[]): boolean => {
    if (faces.length === 0) return false;
    
    // Basic criteria for a "perfect shot"
    const face = faces[0];
    const isLookingAtCamera = Math.abs(face.headEulerAngleY || 0) < 10;
    const isNotTilted = Math.abs(face.headEulerAngleZ || 0) < 10;
    const hasGoodExpression = face.smilingProbability && face.smilingProbability > 0.7;

    return isLookingAtCamera && isNotTilted && hasGoodExpression;
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync();
      const photos = [photo.uri];
      
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

        {detectedFaces.map((face, index) => (
          <View
            key={index}
            style={[
              styles.faceBox,
              {
                left: face.boundingBox.left,
                top: face.boundingBox.top,
                width: face.boundingBox.width,
                height: face.boundingBox.height,
              },
            ]}
          />
        ))}

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
            onPress={takeBurstPhotos}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>

          <Pressable
            style={[
              styles.controlButton,
              isFaceDetecting && styles.activeDetection,
            ]}
            onPress={toggleFaceDetection}
          >
            <MaterialIcons
              name="pets"
              size={32}
              color={theme.colors.text.inverse}
            />
          </Pressable>
        </View>

        {isFaceDetecting && (
          <View style={styles.detectionIndicator}>
            <Text style={styles.detectionText}>Face Detection Active</Text>
          </View>
        )}
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
  activeDetection: {
    backgroundColor: 'rgba(0, 255, 0, 0.5)',
  },
  captureButtonActive: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
  },
  detectionIndicator: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  detectionText: {
    color: theme.colors.text.inverse,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  faceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00ff00',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
});