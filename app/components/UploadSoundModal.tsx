import React, { useState, useEffect } from 'react';
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
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

interface UploadedSound {
  id: string;
  name: string;
  category: 'attention' | 'reward' | 'training';
  uri: string;
  isPremium: boolean;
  icon: string;
}

interface UploadSoundModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (sound: UploadedSound) => void;
}

export default function UploadSoundModal({ visible, onClose, onSave }: UploadSoundModalProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundName, setSoundName] = useState('');
  const [category, setCategory] = useState<'attention' | 'reward' | 'training'>('attention');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  
  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      // Reset state when modal is closed
      resetState();
    }
  }, [visible]);

  const pickAudioFile = async () => {
    try {
      // Clean up previous audio if any
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      setIsUploading(true);
      
      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        setIsUploading(false);
        return;
      }
      
      // Check file size (10MB limit)
      const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
      if (fileInfo.exists && fileInfo.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select an audio file smaller than 10MB.');
        setIsUploading(false);
        return;
      }
      
      // Set default name based on file name
      const name = result.assets[0].name.split('.')[0];
      setSoundName(name);
      setFileName(result.assets[0].name);
      setFileUri(result.assets[0].uri);
      
      // Create a sound object for playback preview
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: result.assets[0].uri },
        { shouldPlay: false }
      );
      
      setSound(audioSound);
      
      // Set up playback status monitoring
      audioSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        }
      });
      
      setIsUploading(false);
      
      // Provide haptic feedback for successful upload
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error picking audio file:', error);
      Alert.alert('Error', 'Failed to pick audio file');
      setIsUploading(false);
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
      Alert.alert('Error', 'Failed to play sound');
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
    if (!fileUri || !soundName.trim()) {
      Alert.alert('Missing information', 'Please upload a sound file and provide a name.');
      return;
    }

    try {
      setIsSaving(true);

      // Generate a unique ID for the sound
      const soundId = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
      
      // Create a local copy of the sound file that will persist
      const extension = fileName?.split('.').pop() || 'mp3';
      const newFileName = `upload-${soundId}.${extension}`;
      const destinationUri = `${FileSystem.documentDirectory}sounds/${newFileName}`;
      
      // Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}sounds`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}sounds`, { intermediates: true });
      }
      
      // Copy the sound file to the persistent location
      await FileSystem.copyAsync({
        from: fileUri,
        to: destinationUri
      });

      // Get the appropriate icon based on category
      const icon = category === 'attention' ? 'notifications' : 
                  category === 'training' ? 'school' : 'stars';

      // Return the new sound object
      onSave({
        id: soundId,
        name: soundName.trim(),
        category: category,
        uri: destinationUri,
        isPremium: false,
        icon: icon
      });
      
      // Reset and close
      resetState();
      onClose();
    } catch (error) {
      console.error('Error saving sound:', error);
      Alert.alert('Error', 'Failed to save sound');
    } finally {
      setIsSaving(false);
    }
  };

  const resetState = () => {
    // Clean up resources
    if (sound) {
      sound.unloadAsync();
    }
    
    // Reset state
    setSound(null);
    setIsPlaying(false);
    setFileUri(null);
    setFileName(null);
    setSoundName('');
    setCategory('attention');
    setIsSaving(false);
    setIsUploading(false);
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
            <Text style={styles.title}>Upload Sound</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={theme.colors.text.secondary} />
            </Pressable>
          </View>
          
          <View style={styles.uploadSection}>
            {!fileUri ? (
              <Pressable
                style={styles.uploadButton}
                onPress={pickAudioFile}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="file-upload" size={32} color="white" />
                    <Text style={styles.uploadButtonText}>Select Audio File</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <View style={styles.filePreview}>
                <View style={styles.fileInfo}>
                  <MaterialIcons name="audio-file" size={24} color={theme.colors.primary} />
                  <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                    {fileName}
                  </Text>
                </View>
                
                <View style={styles.previewControls}>
                  <Pressable
                    style={styles.playButton}
                    onPress={isPlaying ? pauseSound : playSound}
                  >
                    <MaterialIcons
                      name={isPlaying ? "pause" : "play-arrow"}
                      size={24}
                      color="white"
                    />
                  </Pressable>
                  
                  <Pressable
                    style={styles.resetButton}
                    onPress={() => {
                      if (sound) {
                        sound.unloadAsync();
                        setSound(null);
                      }
                      setFileUri(null);
                      setFileName(null);
                      setIsPlaying(false);
                    }}
                  >
                    <MaterialIcons name="delete" size={20} color={theme.colors.text.secondary} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
          
          {fileUri && (
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
  uploadSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  uploadButton: {
    width: '100%',
    height: 120,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  filePreview: {
    width: '100%',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  fileName: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  previewControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
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