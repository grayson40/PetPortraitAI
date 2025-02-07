import * as MLKit from '@react-native-ml-kit/face-detection';
import * as ImageManipulator from 'expo-image-manipulator';

export class PetDetectionService {
  // For now, we'll just assume any photo taken is a pet photo
  // We can enhance this later with proper ML integration
  async detectPets(imageUri: string): Promise<boolean> {
    try {
      // Resize image for faster processing
      const processedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 300 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // TODO: Replace with actual ML Kit pet detection when available
      // For now, we'll use face detection as a placeholder
      const faces = await MLKit.FaceDetector.processImage(processedImage.uri);
      
      // In the future, this would be replaced with pet-specific detection
      return faces.length > 0;
    } catch (error) {
      console.error('Pet detection error:', error);
      return false;
    }
  }

  async getPerfectShotMoment(frames: string[]): Promise<number> {
    // Analyze multiple frames to find the best shot
    // Return the index of the best frame
    try {
      let bestScore = 0;
      let bestFrame = 0;

      for (let i = 0; i < frames.length; i++) {
        const hasPet = await this.detectPets(frames[i]);
        if (hasPet) {
          // TODO: Add more sophisticated scoring
          bestFrame = i;
          break;
        }
      }

      return bestFrame;
    } catch (error) {
      console.error('Perfect shot detection error:', error);
      return 0;
    }
  }
}

export const petDetection = new PetDetectionService(); 