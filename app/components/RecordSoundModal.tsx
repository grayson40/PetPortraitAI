import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Pressable, 
  Alert,
  ActivityIndicator,
  TextInput,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { getSupabase } from '../services/supabase';
import * as FileSystem from 'expo-file-system';

// Updated to match the app's Sound interface
interface RecordedSound {
  id: string;
  name: string;
  category: 'attention' | 'reward' | 'training';
  uri: string;
  isPremium: boolean;
  icon: string; // Added to match the Sound interface
}

interface RecordSoundModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (sound: RecordedSound) => void;
}

export default function RecordSoundModal({ visible, onClose, onSave }: RecordSoundModalProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [soundName, setSoundName] = useState('');
  const [category, setCategory] = useState<'attention' | 'reward' | 'training'>('attention');
  const [isSaving, setIsSaving] = useState(false);
  
  const durationTimer = useRef<NodeJS.Timeout | null>(null);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      if (recording) {
        stopRecording();
      }
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      // Reset state when modal is closed
      resetState();
    } else {
      // Set up recording permissions when modal opens
      setupRecording();
    }
  }, [visible]);

  const setupRecording = async () => {
    try {
      // Get recording permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'You need to grant audio recording permissions to record sounds.');
        onClose();
        return;
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error setting up recording:', error);
      Alert.alert('Error', 'Failed to set up recording');
      onClose();
    }
  };

  const startRecording = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      setRecordingUri(null);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Provide haptic feedback when recording starts
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Start duration timer
      durationTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Create and prepare the recording object
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      
      // Listen for recording status updates
      recording.setOnRecordingStatusUpdate(status => {
        if (status.isRecording) {
          setRecordingDuration(status.durationMillis / 1000);
        }
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;

      // Stop the timer
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }
      
      // Stop recording
      await recording.stopAndUnloadAsync();
      
      // Get the recording URI
      const uri = recording.getURI();
      setRecordingUri(uri);
      
      // Create a sound object for playback
      if (uri) {
        const { sound } = await Audio.Sound.createAsync({ uri });
        setSound(sound);
        
        // Set up playback status monitoring
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        });
      }
      
      setRecording(null);
      setIsRecording(false);
      
      // Provide haptic feedback when recording stops
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
    }
  };

  const playSound = async () => {
    try {
      if (!sound) return;
      
      // Reset the sound position
      await sound.setPositionAsync(0);
      await sound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('Error', 'Failed to play recording');
    }
  };

  const pauseSound = async () => {
    try {
      if (!sound) return;
      
      await sound.pauseAsync();
      setIsPlaying(false);
    } catch (error) {
      console.error('Error pausing sound:', error);
    }
  };

  const handleSave = async () => {
    if (!recordingUri || !soundName.trim()) {
      Alert.alert('Missing information', 'Please provide a name for your sound recording.');
      return;
    }

    try {
      setIsSaving(true);

      // Generate a unique ID for the sound
      const soundId = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      // Create a local copy of the recording that will persist
      const fileName = `recording-${soundId}.m4a`;
      const destinationUri = `${FileSystem.documentDirectory}sounds/${fileName}`;
      
      // Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}sounds`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}sounds`, { intermediates: true });
      }
      
      // Copy the recording to the persistent location
      await FileSystem.copyAsync({
        from: recordingUri,
        to: destinationUri
      });

      // Return the new sound object with icon property
      onSave({
        id: soundId,
        name: soundName.trim(),
        category: category,
        uri: destinationUri,
        isPremium: false,
        icon: category === 'attention' ? 'notifications' : 
              category === 'training' ? 'school' : 'stars'
      });
      
      // Reset and close
      resetState();
      onClose();
    } catch (error) {
      console.error('Error saving recording:', error);
      Alert.alert('Error', 'Failed to save recording');
    } finally {
      setIsSaving(false);
    }
  };

  const resetState = () => {
    // Clean up resources
    if (recording) {
      recording.stopAndUnloadAsync();
    }
    if (sound) {
      sound.unloadAsync();
    }
    if (durationTimer.current) {
      clearInterval(durationTimer.current);
      durationTimer.current = null;
    }
    
    // Reset state
    setRecording(null);
    setSound(null);
    setIsRecording(false);
    setIsPlaying(false);
    setRecordingDuration(0);
    setRecordingUri(null);
    setSoundName('');
    setCategory('attention');
    setIsSaving(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Don't attempt to render if not visible
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <BlurView intensity={30} style={styles.blurBackground} />
        
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Record Sound</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.secondary} />
            </Pressable>
          </View>
          
          <View style={styles.recordingSection}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeDisplay}>
                {formatTime(recordingDuration)}
              </Text>
              <View style={[styles.indicator, isRecording && styles.activeIndicator]} />
            </View>
            
            <View style={styles.controls}>
              {!recordingUri ? (
                // Recording controls
                <Pressable
                  style={[styles.recordButton, isRecording && styles.stopButton]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <MaterialIcons
                    name={isRecording ? "stop" : "mic"}
                    size={32}
                    color="white"
                  />
                </Pressable>
              ) : (
                // Playback controls
                <Pressable
                  style={styles.playButton}
                  onPress={isPlaying ? pauseSound : playSound}
                >
                  <MaterialIcons
                    name={isPlaying ? "pause" : "play-arrow"}
                    size={32}
                    color="white"
                  />
                </Pressable>
              )}
              
              {recordingUri && (
                <Pressable
                  style={styles.resetButton}
                  onPress={() => {
                    if (sound) {
                      sound.unloadAsync();
                      setSound(null);
                    }
                    setRecordingUri(null);
                    setIsPlaying(false);
                  }}
                >
                  <MaterialIcons name="refresh" size={24} color={theme.colors.text.secondary} />
                </Pressable>
              )}
            </View>
          </View>
          
          {recordingUri && (
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Sound Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={soundName}
                  onChangeText={setSoundName}
                  placeholder="Give your sound a name"
                  placeholderTextColor={theme.colors.text.secondary}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categorySelector}>
                  <Pressable
                    style={[
                      styles.categoryButton,
                      category === 'attention' && styles.categoryButtonSelected
                    ]}
                    onPress={() => setCategory('attention')}
                  >
                    <MaterialIcons
                      name="notifications"
                      size={20}
                      color={category === 'attention' ? theme.colors.primary : theme.colors.text.secondary}
                    />
                    <Text style={[
                      styles.categoryText,
                      category === 'attention' && styles.categoryTextSelected
                    ]}>
                      Attention
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={[
                      styles.categoryButton,
                      category === 'training' && styles.categoryButtonSelected
                    ]}
                    onPress={() => setCategory('training')}
                  >
                    <MaterialIcons
                      name="school"
                      size={20}
                      color={category === 'training' ? theme.colors.primary : theme.colors.text.secondary}
                    />
                    <Text style={[
                      styles.categoryText,
                      category === 'training' && styles.categoryTextSelected
                    ]}>
                      Training
                    </Text>
                  </Pressable>
                  
                  <Pressable
                    style={[
                      styles.categoryButton,
                      category === 'reward' && styles.categoryButtonSelected
                    ]}
                    onPress={() => setCategory('reward')}
                  >
                    <MaterialIcons
                      name="stars"
                      size={20}
                      color={category === 'reward' ? theme.colors.primary : theme.colors.text.secondary}
                    />
                    <Text style={[
                      styles.categoryText,
                      category === 'reward' && styles.categoryTextSelected
                    ]}>
                      Reward
                    </Text>
                  </Pressable>
                </View>
              </View>
              
              <Pressable
                style={[
                  styles.saveButton,
                  (!soundName.trim() || isSaving) && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!soundName.trim() || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Save Sound</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 8,
  },
  recordingSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  timeDisplay: {
    fontSize: 28,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#888',
  },
  activeIndicator: {
    backgroundColor: 'red',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: theme.colors.error,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    padding: 12,
    marginLeft: theme.spacing.md,
  },
  formSection: {
    paddingTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  categoryText: {
    fontSize: 14,
    marginLeft: 4,
    color: theme.colors.text.secondary,
  },
  categoryTextSelected: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 