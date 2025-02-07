import { View, Text, Image, StyleSheet, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { mockPhotos } from '../../data/mockPhotos';
import { useState, useEffect } from 'react';
import ImageView from "react-native-image-viewing";
import LoadingIndicator from '../../components/LoadingIndicator';

export default function PhotoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const photo = mockPhotos.find(p => p.id === id);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Array<{ id: string; text: string; author: string; createdAt: Date }>>([]);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  if (!photo) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Photo not found</Text>
      </View>
    );
  }

  const handleAddComment = () => {
    if (comment.trim()) {
      setComments([
        {
          id: Date.now().toString(),
          text: comment,
          author: 'You',
          createdAt: new Date(),
        },
        ...comments,
      ]);
      setComment('');
      Keyboard.dismiss();
    }
  };

  useEffect(() => {
    return () => {
      Keyboard.dismiss();
    };
  }, []);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.imageContainer}>
          <Pressable onPress={() => setIsImageViewVisible(true)}>
            <Image
              source={{ uri: photo.imageUrl }}
              style={styles.image}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />
            {imageLoading && (
              <View style={styles.imageLoadingContainer}>
                <LoadingIndicator size={30} />
              </View>
            )}
          </Pressable>
          <Pressable 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons 
              name="arrow-back" 
              size={24} 
              color={theme.colors.text.inverse} 
            />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable 
              onPress={() => router.push(`/(authenticated)/profile/${photo.userId}`)}
              style={styles.userInfo}
            >
              <Text style={styles.petName}>{photo.petName}</Text>
              <Text style={styles.photographerName}>by {photo.photographerName}</Text>
            </Pressable>
            <Text style={styles.date}>
              {new Date(photo.createdAt).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.stats}>
            <Pressable style={styles.iconButton}>
              <MaterialIcons 
                name="favorite-border" 
                size={24} 
                color={theme.colors.primary} 
              />
              <Text style={styles.iconText}>{photo.likes} likes</Text>
            </Pressable>
          </View>

          <View style={styles.commentsSection}>
            <Text style={styles.sectionTitle}>Comments</Text>
            {comments.map(comment => (
              <View key={comment.id} style={styles.comment}>
                <Text style={styles.commentAuthor}>{comment.author}</Text>
                <Text style={styles.commentText}>{comment.text}</Text>
                <Text style={styles.commentDate}>
                  {comment.createdAt.toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.commentInput}>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Add a comment..."
          placeholderTextColor={theme.colors.text.secondary}
          multiline
        />
        <Pressable 
          style={styles.sendButton}
          onPress={handleAddComment}
        >
          <MaterialIcons 
            name="send" 
            size={24} 
            color={theme.colors.primary} 
          />
        </Pressable>
      </View>

      <ImageView
        images={[{ uri: photo.imageUrl }]}
        imageIndex={0}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 400,
    backgroundColor: theme.colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing.lg,
    left: theme.spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  petName: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
  },
  photographerName: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  date: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  commentsSection: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  comment: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  commentAuthor: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  commentText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
  },
  commentDate: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  commentInput: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    color: theme.colors.text.primary,
  },
  sendButton: {
    justifyContent: 'center',
    padding: theme.spacing.xs,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.xs,
  },
  iconText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  errorText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
}); 