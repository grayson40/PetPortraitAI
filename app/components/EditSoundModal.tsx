import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { theme } from '../styles/theme';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { SoundService } from '../services/sound';

interface Sound {
  id: string;
  name: string;
  category: string;
  url?: string;
  uri?: string;
  isPremium: boolean;
  isUserSound?: boolean;
}

interface EditSoundModalProps {
  visible: boolean;
  onClose: () => void;
  sound: Sound | null;
  onSave: (editedSound: Sound | null) => void;
}

export default function EditSoundModal({ visible, onClose, sound, onSave }: EditSoundModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Sound trimming state variables
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackInstance, setPlaybackInstance] = useState<Audio.Sound | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [playbackUpdateInterval, setPlaybackUpdateInterval] = useState<NodeJS.Timeout | null>(null);

  // When modal opens, reset the form
  useEffect(() => {
    if (visible && sound) {
      setName(sound.name || '');
      setCategory(sound.category || '');
      loadSound();
    }
    
    // Clean up when modal closes
    return () => {
      if (playbackInstance) {
        playbackInstance.unloadAsync();
      }
      if (playbackUpdateInterval) {
        clearInterval(playbackUpdateInterval);
      }
    };
  }, [visible, sound]);

  // Load sound for playback
  const loadSound = async () => {
    if (!sound?.uri && !sound?.url) return;
    
    try {
      setIsLoading(true);
      
      // Unload any existing sound
      if (playbackInstance) {
        await playbackInstance.unloadAsync();
      }
      
      // Create and load new sound
      const { sound: soundInstance } = await Audio.Sound.createAsync(
        { uri: sound.uri || sound.url! },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      
      setPlaybackInstance(soundInstance);
      
      // Get duration
      const status = await soundInstance.getStatusAsync();
      if (status.isLoaded) {
        const durationMs = status.durationMillis || 0;
        setDuration(durationMs);
        setEndTime(durationMs);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading sound:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to load sound for editing');
    }
  };
  
  // Handle playback status updates
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && status.isPlaying) {
      setCurrentPosition(status.positionMillis);
      
      // Stop playback if it reaches the end time
      if (status.positionMillis >= endTime) {
        stopPlayback();
      }
    }
    
    if (status.didJustFinish) {
      setIsPlaying(false);
      setCurrentPosition(startTime);
    }
  };
  
  // Play/pause the sound
  const togglePlayback = async () => {
    if (!playbackInstance) return;
    
    try {
      if (isPlaying) {
        await playbackInstance.pauseAsync();
        setIsPlaying(false);
        if (playbackUpdateInterval) {
          clearInterval(playbackUpdateInterval);
          setPlaybackUpdateInterval(null);
        }
      } else {
        // Set playback position to start time
        await playbackInstance.setPositionAsync(startTime);
        await playbackInstance.playAsync();
        setIsPlaying(true);
        
        // Update position regularly
        const interval = setInterval(async () => {
          const status = await playbackInstance.getStatusAsync();
          if (status.isLoaded) {
            setCurrentPosition(status.positionMillis);
          }
        }, 100);
        setPlaybackUpdateInterval(interval);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };
  
  // Stop playback
  const stopPlayback = async () => {
    if (!playbackInstance) return;
    
    try {
      await playbackInstance.pauseAsync();
      await playbackInstance.setPositionAsync(startTime);
      setIsPlaying(false);
      setCurrentPosition(startTime);
      
      if (playbackUpdateInterval) {
        clearInterval(playbackUpdateInterval);
        setPlaybackUpdateInterval(null);
      }
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };
  
  // Format milliseconds to mm:ss
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSave = async () => {
    if (!sound) return;
    
    try {
      setLoading(true);
      const soundService = SoundService.getInstance();
      
      // If the sound was trimmed, crop it
      if (startTime > 0 || endTime < duration) {
        await soundService.cropUserSound(sound.id, startTime, endTime);
      }
      
      // Return the updated sound
      const updatedSound = {
        ...sound,
        name,
        category
      };
      
      onSave(updatedSound);
      onClose();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error updating sound:', error);
      Alert.alert('Error', 'Failed to update sound');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Sound',
      'Are you sure you want to delete this sound? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const soundService = SoundService.getInstance();
              await soundService.deleteUserSound(sound!.id);
              onSave(null); // Indicate sound was deleted
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onClose();
            } catch (error) {
              console.error('Error deleting sound:', error);
              Alert.alert('Error', 'Failed to delete sound');
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Sound</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.primary} />
            </Pressable>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : (
            <>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Sound name"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    style={styles.input}
                    value={category}
                    onChangeText={setCategory}
                    placeholder="Category"
                  />
                </View>

                {/* Sound trimming controls */}
                <View style={styles.playerSection}>
                  <Text style={styles.label}>Trim Sound</Text>
                  
                  <View style={styles.playbackControls}>
                    <Pressable 
                      style={styles.playButton}
                      onPress={togglePlayback}
                    >
                      <MaterialIcons 
                        name={isPlaying ? "pause" : "play-arrow"} 
                        size={32} 
                        color={theme.colors.primary} 
                      />
                    </Pressable>
                    <Text style={styles.timeText}>
                      {formatTime(currentPosition)} / {formatTime(duration)}
                    </Text>
                  </View>
                  
                  {/* Progress bar */}
                  <View style={styles.progressContainer}>
                    <Slider
                      style={styles.progressBar}
                      minimumValue={0}
                      maximumValue={duration}
                      value={currentPosition}
                      onValueChange={(value) => {
                        setCurrentPosition(value);
                        if (playbackInstance) {
                          playbackInstance.setPositionAsync(value);
                        }
                      }}
                      minimumTrackTintColor={theme.colors.primary}
                      maximumTrackTintColor={theme.colors.border}
                      thumbTintColor={theme.colors.primary}
                    />
                  </View>
                  
                  <View style={styles.trimSection}>
                    <Text style={styles.label}>Start Time: {formatTime(startTime)}</Text>
                    <Slider
                      style={styles.trimSlider}
                      minimumValue={0}
                      maximumValue={endTime}
                      value={startTime}
                      onValueChange={(value) => {
                        setStartTime(value);
                        if (!isPlaying) {
                          setCurrentPosition(value);
                          if (playbackInstance) {
                            playbackInstance.setPositionAsync(value);
                          }
                        }
                      }}
                      minimumTrackTintColor={theme.colors.primary}
                      maximumTrackTintColor={theme.colors.border}
                      thumbTintColor={theme.colors.primary}
                    />
                    
                    <Text style={styles.label}>End Time: {formatTime(endTime)}</Text>
                    <Slider
                      style={styles.trimSlider}
                      minimumValue={startTime}
                      maximumValue={duration}
                      value={endTime}
                      onValueChange={setEndTime}
                      minimumTrackTintColor={theme.colors.primary}
                      maximumTrackTintColor={theme.colors.border}
                      thumbTintColor={theme.colors.primary}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.footer}>
                <Pressable 
                  style={[styles.deleteButton, deleting && styles.disabledButton]}
                  onPress={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  )}
                </Pressable>
                
                <Pressable 
                  style={[styles.saveButton, loading && styles.disabledButton]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    elevation: 5,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.spacing.sm,
  },
  form: {
    gap: theme.spacing.lg,
  },
  inputGroup: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xl,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    flex: 1,
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    width: 100,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  playerSection: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  progressContainer: {
    width: '100%',
  },
  progressBar: {
    width: '100%',
    height: 30,
  },
  trimSection: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  trimSlider: {
    width: '100%',
    height: 30,
  },
}); 