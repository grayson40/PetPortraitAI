import { View, Text, StyleSheet, Image, Pressable, ScrollView, Share, Alert, Platform } from 'react-native';
import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

export default function PhotoSelection() {
  const { photos: photoString } = useLocalSearchParams<{ photos: string }>();
  const photos = JSON.parse(photoString || '[]') as string[];
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!selectedPhoto) {
      Alert.alert('Error', 'Please select a photo first');
      return;
    }

    // Navigate to caption screen with selected photo
    router.push({
      pathname: '/(authenticated)/photo-details',
      params: { photo: selectedPhoto }
    });
  };

  const handleShare = async () => {
    if (!selectedPhoto) {
      Alert.alert('Error', 'Please select a photo first');
      return;
    }

    try {
      await Share.share({
        url: selectedPhoto,
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share photo');
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
        <Text style={styles.title}>Choose Your Best Shot</Text>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
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
        </View>

        <Text style={styles.subtitle}>All Photos</Text>
        <ScrollView 
          horizontal 
          style={styles.photoStrip} 
          showsHorizontalScrollIndicator={false}
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

        <View style={styles.actions}>
          <Pressable 
            style={[
              styles.actionButton,
              !selectedPhoto && styles.actionButtonDisabled
            ]}
            onPress={handleUpload}
            disabled={!selectedPhoto}
          >
            <MaterialIcons name="cloud-upload" size={24} color={theme.colors.text.inverse} />
            <Text style={styles.buttonText}>Continue to Upload</Text>
          </Pressable>

          <Pressable 
            style={[
              styles.actionButton,
              styles.shareButton,
              !selectedPhoto && styles.actionButtonDisabled
            ]}
            onPress={handleShare}
            disabled={!selectedPhoto}
          >
            <MaterialIcons name="share" size={24} color={theme.colors.text.inverse} />
            <Text style={styles.buttonText}>Share</Text>
          </Pressable>
        </View>
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
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  scrollContainer: {
    flex: 1,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
  },
  preview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.body.fontSize,
  },
  photoStrip: {
    flexGrow: 0,
    height: 120,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  photoContainer: {
    width: 110,
    height: 110,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: theme.colors.surface,
  },
  selectedPhoto: {
    borderWidth: 3,
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
  actions: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
  },
  shareButton: {
    backgroundColor: theme.colors.secondary,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: theme.colors.text.inverse,
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
}); 