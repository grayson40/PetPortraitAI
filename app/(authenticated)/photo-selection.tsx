import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, ScrollView, Share, Alert, Platform, ActivityIndicator, Clipboard, ToastAndroid, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import * as FileSystem from 'expo-file-system';
import { API_CONFIG } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For typed API responses
interface VisionAPIResult {
  labelAnnotations?: Array<{
    description: string;
    score: number;
  }>;
  webDetection?: {
    webEntities?: Array<{
      description: string;
      score: number;
    }>;
  };
}

interface AISuggestion {
  caption: string;
  hashtags: string[];
}

// Normalize hashtag format (ensure it starts with # and remove extra whitespace)
const normalizeHashtag = (tag: string): string => {
  // Remove any whitespace and make it one word
  const cleaned = tag.trim().replace(/\s+/g, '');
  // Add # prefix if it doesn't exist
  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
};

export default function PhotoSelection() {
  const { photos: photoString } = useLocalSearchParams<{ photos: string }>();
  const photos = JSON.parse(photoString || '[]') as string[];
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(photos.length > 0 ? photos[0] : null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [copiedText, setCopiedText] = useState<'caption' | 'hashtags' | 'both' | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate caption container when it appears
    if (aiSuggestion) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
    }
  }, [aiSuggestion]);

  // Unified share function that includes caption and hashtags
  const handleShare = async () => {
    if (!selectedPhoto) {
      Alert.alert('Error', 'Please select a photo first');
      return;
    }

    try {
      setIsSharing(true);
      const textToShare = aiSuggestion 
        ? `${aiSuggestion.caption}\n\n${aiSuggestion.hashtags.join(' ')}`
        : '';
        
      const result = await Share.share({
        url: selectedPhoto,
        message: textToShare,
      });
      
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
          console.log(`Shared with ${result.activityType}`);
        } else {
          // shared
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share photo');
    } finally {
      setIsSharing(false);
    }
  };

  // Convert image URI to base64
  const getImageBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error('Failed to process image');
    }
  };

  const generateAISuggestions = async () => {
    if (!selectedPhoto) {
      Alert.alert('Error', 'Please select a photo first');
      return;
    }

    setIsGenerating(true);
    setAiSuggestion(null);
    setCopiedText(null);
    scaleAnim.setValue(0.95);
    fadeAnim.setValue(0);

    try {
      // Convert image to base64
      const imageBase64 = await getImageBase64(selectedPhoto);

      // Get user personality from AsyncStorage
      const userProfile = await AsyncStorage.getItem('user_profile');
      const userProfileJson = userProfile ? JSON.parse(userProfile) : null;
      const personality = userProfileJson?.caption_personality || 'short';
      
      // Call backend API using fetch instead of axios
      const response = await fetch(`${API_CONFIG.url}/captions/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          personality: personality
        })
      });
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      // Parse the JSON response
      const data = await response.json();
      
      // Normalize hashtags to ensure proper formatting
      const normalizedData = {
        ...data,
        hashtags: Array.isArray(data.hashtags) 
          ? data.hashtags
              .filter(tag => tag && typeof tag === 'string')
              .map(normalizeHashtag)
          : []
      };
      
      // Set the AI suggestion from the API response
      setAiSuggestion(normalizedData);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      Alert.alert('Error', 'Failed to generate suggestions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string, type: 'caption' | 'hashtags' | 'both') => {
    try {
      Clipboard.setString(text);
      setCopiedText(type);
      
      // Show toast on Android
      if (Platform.OS === 'android') {
        ToastAndroid.show('Copied to clipboard!', ToastAndroid.SHORT);
      } else {
        // On iOS, show visual feedback only - will clear after 2 seconds
        setTimeout(() => {
          setCopiedText(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const copyAll = () => {
    if (aiSuggestion) {
      const text = `${aiSuggestion.caption}\n\n${aiSuggestion.hashtags.join(' ')}`;
      copyToClipboard(text, 'both');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Share Photo</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewContainer}>
          {selectedPhoto ? (
            <Image 
              source={{ uri: selectedPhoto }} 
              style={styles.preview}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <MaterialIcons name="photo" size={48} color={theme.colors.text.secondary} />
              <Text style={styles.placeholderText}>Select a photo to preview</Text>
            </View>
          )}

          {photos.length > 1 && (
            <ScrollView 
              horizontal 
              style={styles.photoStrip} 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoStripContent}
            >
              {photos.map((photo, index) => (
                <Pressable
                  key={index}
                  onPress={() => setSelectedPhoto(photo)}
                  style={[
                    styles.photoContainer,
                    selectedPhoto === photo && styles.selectedPhoto,
                  ]}
                >
                  <Image source={{ uri: photo }} style={styles.thumbnail} />
                  {selectedPhoto === photo && (
                    <View style={styles.selectedOverlay}>
                      <MaterialIcons name="check-circle" size={24} color={theme.colors.primary} />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {!aiSuggestion ? (
          <Pressable 
            style={[
              styles.generateButton,
              (isGenerating || !selectedPhoto) && styles.buttonDisabled
            ]}
            onPress={generateAISuggestions}
            disabled={isGenerating || !selectedPhoto}
          >
            {isGenerating ? (
              <View style={styles.buttonInner}>
                <ActivityIndicator color="white" size="small" />
                <Text style={styles.buttonText}>Creating perfect caption...</Text>
              </View>
            ) : (
              <View style={styles.buttonInner}>
                <MaterialIcons name="auto-awesome" size={24} color="white" />
                <Text style={styles.buttonText}>Generate AI Caption & Tags</Text>
              </View>
            )}
          </Pressable>
        ) : (
          <Animated.View 
            style={[
              styles.captionContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={styles.captionHeader}>
              <View style={styles.captionTitleContainer}>
                <MaterialIcons name="auto-awesome" size={18} color={theme.colors.warning} />
                <Text style={styles.captionTitle}>AI Caption</Text>
              </View>
              <Pressable 
                style={styles.refreshButton}
                onPress={generateAISuggestions}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                ) : (
                  <MaterialIcons name="refresh" size={18} color={theme.colors.text.secondary} />
                )}
              </Pressable>
            </View>
            
            <Text style={styles.captionText}>{aiSuggestion.caption}</Text>
            
            <View style={styles.hashtagContainer}>
              {aiSuggestion?.hashtags && aiSuggestion.hashtags.length > 0 ? (
                aiSuggestion.hashtags.map((tag, index) => (
                  <Text 
                    key={index} 
                    style={styles.hashtagText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {tag}
                  </Text>
                ))
              ) : (
                <Text style={styles.noHashtagsText}>No hashtags available</Text>
              )}
            </View>
            
            <Pressable
              style={styles.copyButton}
              onPress={copyAll}
            >
              <MaterialIcons 
                name={copiedText === 'both' ? "check" : "content-copy"} 
                size={18} 
                color="white" 
              />
              <Text style={styles.copyButtonText}>
                {copiedText === 'both' ? "Copied to clipboard" : "Copy caption & hashtags"}
              </Text>
            </Pressable>
          </Animated.View>
        )}

        <Pressable 
          style={[
            styles.shareButton,
            (!selectedPhoto || isSharing) && styles.buttonDisabled
          ]}
          onPress={handleShare}
          disabled={!selectedPhoto || isSharing}
        >
          {isSharing ? (
            <View style={styles.buttonInner}>
              <ActivityIndicator color="white" size="small" />
              <Text style={styles.buttonText}>Opening share options...</Text>
            </View>
          ) : (
            <View style={styles.buttonInner}>
              <MaterialIcons name="share" size={24} color="white" />
              <Text style={styles.buttonText}>
                {aiSuggestion ? "Share Photo with Caption" : "Share Photo"}
              </Text>
            </View>
          )}
        </Pressable>
        
        <Text style={styles.disclaimer}>
          Your photo and caption will be shared together using your device's share options.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: Platform.OS === 'ios' ? 47 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    marginRight: theme.spacing.md,
    padding: 4,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F9FAFC',
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 40,
  },
  previewContainer: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain',
    backgroundColor: 'white',
  },
  placeholderContainer: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  placeholderText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.body.fontSize,
  },
  photoStrip: {
    height: 90,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  photoStripContent: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  photoContainer: {
    width: 70,
    height: 70,
    marginHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedPhoto: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  selectedOverlay: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: theme.borderRadius.full,
    padding: 2,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  generateButton: {
    backgroundColor: theme.colors.warning,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  shareButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  captionContainer: {
    backgroundColor: 'white',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  captionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  captionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  captionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  refreshButton: {
    padding: 8,
  },
  captionText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
    minHeight: 30,
  },
  hashtagText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.primary,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    overflow: 'visible',
    textAlign: 'center',
    maxWidth: '100%',
  },
  noHashtagsText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  copyButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  disclaimer: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
}); 