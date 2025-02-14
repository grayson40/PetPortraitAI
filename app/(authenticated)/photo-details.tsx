import { View, Text, StyleSheet, Image, Pressable, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { API_CONFIG } from '../constants/config';
import { getSupabase } from '../services/supabase';
import AddPetModal from '../components/AddPetModal';

interface Pet {
  id: string;
  name: string;
  type: string;
}

export default function PhotoDetails() {
  const { photo } = useLocalSearchParams<{ photo: string }>();
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [pets, setPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [isAddPetModalVisible, setIsAddPetModalVisible] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [hashtags, setHashtags] = useState([]);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/pets/${user.id}`);
      const data = await response.json();

      if (response.ok) {
        setPets(data);
        if (data.length > 0) {
          setSelectedPetId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading pets:', error);
      Alert.alert('Error', 'Failed to load pets');
    } finally {
      setLoadingPets(false);
    }
  };

  const handleAddPet = (newPet: Pet) => {
    setPets(prev => [...prev, newPet]);
    setSelectedPetId(newPet.id);
    setIsAddPetModalVisible(false);
    Alert.alert('Success', `${newPet.name} has been added to your pets!`);
  };

  const handleUpload = async () => {
    if (!selectedPetId) {
      Alert.alert('Error', 'Please select a pet');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      // Upload image to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.jpg`;
      
      // Convert uri to base64
      const photoResponse = await fetch(photo);
      const blob = await photoResponse.blob();

      // Create file from blob
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await getSupabase()
        .storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Failed to upload photo to storage');
      }

      if (!uploadData?.path) {
        throw new Error('No upload path returned');
      }

      // Get the public URL
      const { data: { publicUrl } } = getSupabase()
        .storage
        .from('photos')
        .getPublicUrl(uploadData.path);

      if (!publicUrl) {
        throw new Error('Failed to get public URL');
      }

      // Create photo record in database
      const response = await fetch(`${API_CONFIG.url}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          pet_id: selectedPetId,
          image_url: publicUrl,
          caption: caption.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create photo record');
      }

      Alert.alert(
        'Success', 
        'Photo uploaded successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.push('/(authenticated)/(tabs)/')
          }
        ]
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (photoId: string) => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/photos/${photoId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!response.ok) throw new Error('Failed to like photo');
      
      // Update UI state
      setLiked(true);
      setLikesCount(prev => prev + 1);
    } catch (error) {
      console.error('Error liking photo:', error);
      Alert.alert('Error', 'Failed to like photo');
    }
  };

  const handleComment = async (photoId: string, content: string) => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/photos/${photoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: user.id,
          content: content.trim()
        }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      const newComment = await response.json();
      setComments(prev => [...prev, newComment]);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const generateCaption = async (imageUrl: string) => {
    try {
      const response = await fetch(`${API_CONFIG.url}/photos/generate-caption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_url: imageUrl }),
      });

      if (!response.ok) throw new Error('Failed to generate caption');

      const { caption, hashtags } = await response.json();
      setCaption(caption);
      setHashtags(hashtags);
    } catch (error) {
      console.error('Error generating caption:', error);
      Alert.alert('Error', 'Failed to generate caption');
    }
  };

  // const selectedPet = pets.find(pet => pet.id === selectedPetId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>New Post</Text>
        {!uploading && (
          <Pressable
            style={[styles.shareButton, !selectedPetId && styles.shareButtonDisabled]}
            onPress={handleUpload}
            disabled={!selectedPetId}
          >
            <Text style={styles.shareButtonText}>Share</Text>
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.content}>
          <View style={styles.topSection}>
            <Image source={{ uri: photo }} style={styles.thumbnailPreview} />
            <View style={styles.captionInputContainer}>
              <TextInput
                style={styles.captionInput}
                placeholder="Write a caption..."
                placeholderTextColor={theme.colors.text.secondary}
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={2200}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.form}>
            {loadingPets ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading your pets...</Text>
              </View>
            ) : (
              <View style={styles.petSelector}>
                <View style={styles.petSelectorHeader}>
                  <Text style={styles.label}>Choose Pet</Text>
                  <Pressable 
                    onPress={() => setIsAddPetModalVisible(true)}
                    style={styles.addPetButton}
                  >
                    <MaterialIcons name="add" size={20} color={theme.colors.primary} />
                    <Text style={styles.addPetText}>New Pet</Text>
                  </Pressable>
                </View>
                
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.petsScrollView}
                  contentContainerStyle={styles.petsContainer}
                >
                  {pets.length > 0 ? (
                    pets.map(pet => (
                      <Pressable
                        key={pet.id}
                        style={[
                          styles.petPill,
                          selectedPetId === pet.id && styles.selectedPetPill
                        ]}
                        onPress={() => setSelectedPetId(pet.id)}
                      >
                        <MaterialIcons 
                          name="pets" 
                          size={16} 
                          color={selectedPetId === pet.id ? theme.colors.primary : theme.colors.text.secondary} 
                        />
                        <Text style={[
                          styles.petPillText,
                          selectedPetId === pet.id && styles.selectedPetPillText
                        ]}>
                          {pet.name}
                        </Text>
                        <Text style={styles.petPillType}>
                          ({pet.type})
                        </Text>
                      </Pressable>
                    ))
                  ) : (
                    <Pressable 
                      style={styles.noPetsButton}
                      onPress={() => setIsAddPetModalVisible(true)}
                    >
                      <MaterialIcons name="pets" size={20} color={theme.colors.primary} />
                      <Text style={styles.noPetsText}>Add your first pet</Text>
                    </Pressable>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.uploadingText}>Sharing your photo...</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <AddPetModal
        visible={isAddPetModalVisible}
        onClose={() => setIsAddPetModalVisible(false)}
        onAdd={handleAddPet}
      />
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
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  shareButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  shareButtonText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.typography.body.fontSize,
  },
  shareButtonDisabled: {
    opacity: 0.5,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  topSection: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'flex-start',
  },
  thumbnailPreview: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.md,
  },
  captionInputContainer: {
    flex: 1,
  },
  captionInput: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    minHeight: 60,
    padding: 0, // Remove padding to align with image
  },
  form: {
    flex: 1,
  },
  loadingContainer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.text.secondary,
  },
  petSelector: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  petSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  addPetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.xs,
  },
  addPetText: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption.fontSize,
    marginLeft: theme.spacing.xs,
    fontWeight: '600',
  },
  petsScrollView: {
    flexGrow: 0,
  },
  petsContainer: {
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
    flexDirection: 'row',
  },
  petPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedPetPill: {
    backgroundColor: theme.colors.primary + '10', // 10% opacity
    borderColor: theme.colors.primary,
  },
  petPillText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  selectedPetPillText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  petPillType: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  noPetsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  noPetsText: {
    color: theme.colors.primary,
    fontSize: theme.typography.body.fontSize,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text.primary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
}); 