import React, { View, Text, StyleSheet, Pressable, Alert, Platform, FlatList, ScrollView, StatusBar } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import * as MediaLibrary from 'expo-media-library';
import { Sound, mockSounds } from '../../data/mockSounds';
import SoundSelector from '../../components/SoundSelector';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import LoadingIndicator from '../../components/LoadingIndicator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SoundService } from '../../services/sound';
import { CollectionService } from '../../services/collection';

const BURST_COUNT = 3;
const BURST_INTERVAL = 150; // 150ms between shots for more reliable burst

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaLibraryPermission, requestMediaLibraryPermission] = MediaLibrary.usePermissions();
  const [audioPermission, requestAudioPermission] = Audio.usePermissions();
  const [type, setType] = useState<CameraType>('back');
  const cameraRef = useRef<CameraView>(null);
  const [selectedSound, setSelectedSound] = useState<Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBurstMode, setIsBurstMode] = useState(false);
  const [soundVolume, setSoundVolume] = useState(0.8);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [collectionSounds, setCollectionSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState<'basic' | 'premium'>('basic');
  const [basicSounds, setBasicSounds] = useState<Sound[]>([]);

  // Request necessary permissions on mount
  useEffect(() => {
    const requestAllPermissions = async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
      if (!mediaLibraryPermission?.granted) {
        await requestMediaLibraryPermission();
      }
      if (!audioPermission?.granted) {
        await requestAudioPermission();
      }
    };
    
    requestAllPermissions();
    
    return () => {
      // Clean up sound resources
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Load user settings
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const userProfile = await AsyncStorage.getItem('user_profile');
        if (userProfile) {
          const userProfileData = JSON.parse(userProfile);
          setSoundVolume(userProfileData.sound_volume / 100);
          setUserTier(userProfileData.subscription_tier === 'premium' ? 'premium' : 'basic');
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };
    
    loadUserSettings();
  }, []);

  // Get basic (non-premium) sounds
  useEffect(() => {
    // Filter mock sounds to get only non-premium ones
    const nonPremiumSounds = mockSounds.filter(sound => !sound.isPremium);
    setBasicSounds(nonPremiumSounds);
  }, []);

  // Initialize camera and load sounds
  useEffect(() => {
    const initializeCamera = async () => {
      setLoading(true);
      try {
        // Load user profile to get subscription tier
        const userProfile = await AsyncStorage.getItem('user_profile');
        if (userProfile) {
          const userProfileData = JSON.parse(userProfile);
          const tier = userProfileData.subscription_tier === 'premium' ? 'premium' : 'basic';
          setUserTier(tier);
          
          if (tier === 'basic') {
            // For basic users, just load basic sounds
            // const nonPremiumSounds = mockSounds.filter(sound => !sound.isPremium);
            setCollectionSounds(mockSounds);
            
            // if (nonPremiumSounds.length > 0) {
            //   setSelectedSound(nonPremiumSounds[0]);
            // }
          } else {
            // For premium users, load sounds from their collection
            const activeCollectionId = await AsyncStorage.getItem('activeCollectionId');
            
            if (!activeCollectionId) {
              // If no active collection, use default collection
              const collectionService = CollectionService.getInstance();
              const collections = await collectionService.getUserCollections();
              
              if (collections && collections.length > 0) {
                const defaultCollection = collections[0];
                await collectionService.setActiveCollection(defaultCollection.id);
                const sounds = await collectionService.getCollectionSounds(defaultCollection.id);
                setCollectionSounds(sounds);
                
                if (sounds.length > 0) {
                  setSelectedSound(sounds[0]);
                }
              } else {
                // If no collections at all, fallback to basic sounds
                setCollectionSounds(basicSounds);
                if (basicSounds.length > 0) {
                  setSelectedSound(basicSounds[0]);
                }
              }
            } else {
              // Load sounds from active collection
              const collectionService = CollectionService.getInstance();
              const sounds = await collectionService.getCollectionSounds(activeCollectionId);
              
              if (sounds && sounds.length > 0) {
                setCollectionSounds(sounds);
                
                // Try to load previously selected sound or default to first
                const storedSelectedSound = await AsyncStorage.getItem('selectedSound');
                if (storedSelectedSound) {
                  const parsedSound = JSON.parse(storedSelectedSound);
                  const foundSound = sounds.find((s: Sound) => s.id === parsedSound.id);
                  if (foundSound) {
                    setSelectedSound(foundSound);
                  } else {
                    setSelectedSound(sounds[0]);
                  }
                } else {
                  setSelectedSound(sounds[0]);
                }
              } else {
                // If no sounds in collection, fallback to basic sounds
                setCollectionSounds(basicSounds);
                if (basicSounds.length > 0) {
                  setSelectedSound(basicSounds[0]);
                }
              }
            }
          }
        } else {
          // No user profile, default to basic sounds
          setCollectionSounds(basicSounds);
          if (basicSounds.length > 0) {
            setSelectedSound(basicSounds[0]);
          }
        }
      } catch (error) {
        console.error('Error initializing camera:', error);
        Alert.alert(
          'Error',
          'Failed to initialize camera. Please try again later.'
        );
        
        // Fall back to basic sounds
        setCollectionSounds(basicSounds);
        if (basicSounds.length > 0) {
          setSelectedSound(basicSounds[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeCamera();
  }, [basicSounds]);

  const handleSoundSelect = async (sound: Sound) => {
    try {
      if (!sound || !sound.uri) {
        console.error('Invalid sound selected:', sound);
        return;
      }

      // Don't allow selection of premium sounds for basic users
      if (sound.isPremium && userTier === 'basic') {
        Alert.alert(
          'Premium Sound',
          'Upgrade to premium to use this sound',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Upgrade', 
              onPress: () => router.push('/(authenticated)/(tabs)/profile' as any) 
            }
          ]
        );
        return;
      }

      setSelectedSound(sound);
      
      // Store the selected sound for future sessions
      await AsyncStorage.setItem('selectedSound', JSON.stringify(sound));

      // Play the sound to preview
      setIsPlaying(true);
      await playSound(sound);
      setTimeout(() => setIsPlaying(false), 1000);
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play sound');
      setIsPlaying(false);
    }
  };

  const playSound = async (sound: Sound) => {
    try {
      if (!sound || !sound.uri) {
        console.error('Invalid sound data:', sound);
        return;
      }

      // Unload previous sound if exists
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Format the URI to ensure it's a direct audio file
      let uri = sound.uri;
      if (typeof uri === 'string' && uri.includes('freesound.org')) {
        uri = uri
          .replace('freesound.org', 'cdn.freesound.org/sounds')
          .replace('/sounds/', '/previews/');
        
        // Add .mp3 extension if missing
        if (!uri.endsWith('.mp3')) {
          uri = `${uri}.mp3`;
        }
      }

      // Create and play the sound
      const { sound: audioSound } = await Audio.Sound.createAsync(
        typeof uri === 'string' ? { uri } : uri,
        { 
          volume: soundVolume,
          shouldPlay: true,
        }
      );
      
      soundRef.current = audioSound;
      await audioSound.playAsync();

      // Update UI based on playback status
      audioSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.error) {
          console.error('Playback error:', status.error);
          setIsPlaying(false);
        }
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });

    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPlaying(false);
      throw error;
    }
  };

  const takeBurstPhotos = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }
    
    if (isBurstMode) {
      // Already in burst mode taking photos
      return;
    }
    
    setIsBurstMode(true);
    const photos = [];

    try {
      for (let i = 0; i < BURST_COUNT; i++) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8, // Lower quality for faster processing
          skipProcessing: false,
        });
        
        if (photo) {
          photos.push(photo.uri);
          
          // Save to media library if we have permission
          if (mediaLibraryPermission?.granted) {
            await MediaLibrary.saveToLibraryAsync(photo.uri);
          }
        }
        
        // Wait between shots
        if (i < BURST_COUNT - 1) {
          await new Promise(resolve => setTimeout(resolve, BURST_INTERVAL));
        }
      }

      // Play sound after all photos are taken
      if (selectedSound) {
        await playSound(selectedSound);
      }

      // Navigate to photo selection screen
      if (photos.length > 0) {
        router.push({
          pathname: '/(authenticated)/photo-selection',
          params: { photos: JSON.stringify(photos) }
        });
      } else {
        throw new Error('No photos captured');
      }
    } catch (error) {
      console.error('Error taking burst photos:', error);
      Alert.alert('Error', 'Failed to capture burst photos');
    } finally {
      setIsBurstMode(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    try {
      // Take the picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1, // Full quality for single shots
      });
      
      // Save photo to media library if permission granted
      if (mediaLibraryPermission?.granted && photo?.uri) {
        await MediaLibrary.saveToLibraryAsync(photo.uri);
      }

      // TODO: This weirdly plays the sound on photo capture ... maybe work better for next version
      // // Play the selected sound
      // if (selectedSound) {
      //   await playSound(selectedSound);
      // }

      // Navigate to photo selection screen
      if (photo?.uri) {
        router.push({
          pathname: '/(authenticated)/photo-selection',
          params: { photos: JSON.stringify([photo.uri]) }
        });
      } else {
        throw new Error('Failed to capture photo');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  // Switch camera between front and back
  const toggleCameraType = () => {
    setType(current => (current === 'back' ? 'front' : 'back'));
  };

  // Render a subscription upgrade message for basic users
  const renderUpgradePrompt = () => {
    if (userTier === 'premium') return null;
    
    return (
      <Pressable 
        style={styles.upgradePrompt}
        onPress={() => router.push('/(authenticated)/(tabs)/profile' as any)}
      >
        <MaterialIcons name="star" size={16} color={theme.colors.warning} />
        <Text style={styles.upgradeText}>Upgrade to premium for more sounds</Text>
      </Pressable>
    );
  };

  // Show loading screen when permissions not granted or during initialization
  if (!permission?.granted || !mediaLibraryPermission?.granted || loading) {
    return <LoadingIndicator message="Preparing camera..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={type}
        mode="picture"
        zoom={0}
      >
        {/* Upgrade prompt for basic users */}
        {/* {renderUpgradePrompt()} */}

        {/* Sound selector above the camera controls */}
        <SoundSelector
          sounds={collectionSounds}
          selectedSound={selectedSound}
          onSelectSound={handleSoundSelect}
          isPlaying={isPlaying}
          userTier={userTier}
        />

        {/* Camera controls */}
        <View style={styles.controls}>
          <Pressable
            style={styles.controlButton}
            onPress={toggleCameraType}
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
            onPress={isBurstMode ? undefined : (isBurstMode ? takeBurstPhotos : takePicture)}
            disabled={isBurstMode}
          >
            <View style={styles.captureButtonInner} />
          </Pressable>

          <Pressable
            style={[
              styles.controlButton,
              isBurstMode && styles.activeControlButton
            ]}
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
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 0,
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: theme.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControlButton: {
    backgroundColor: 'rgba(255,0,0,0.6)',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.text.inverse,
  },
  captureButtonActive: {
    backgroundColor: 'rgba(255,0,0,0.3)',
  },
  upgradePrompt: {
    position: 'absolute',
    bottom: 190, // Position above sound selector
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  upgradeText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.caption.fontSize,
  },
});