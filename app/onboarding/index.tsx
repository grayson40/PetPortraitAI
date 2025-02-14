import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { getSupabase } from '../services/supabase';
import { theme } from '../styles/theme';

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to PetPortrait',
    description: 'Your AI-powered pet photography assistant',
    icon: 'pets'
  },
  {
    title: 'Complete Your Profile',
    description: 'Help us personalize your experience',
    icon: 'person',
    isUserInfo: true
  },
  {
    title: 'Smart Camera',
    description: 'Our AI detects the perfect moment to capture your pet',
    icon: 'camera'
  },
  {
    title: 'Attention Sounds',
    description: 'Use our curated sound library to grab your pet\'s attention',
    icon: 'music-note'
  },
  {
    title: 'Ready to Start',
    description: 'Let\'s capture some amazing pet photos!',
    icon: 'photo-camera'
  }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    try {
      setLoading(true);
      
      // Update user profile in Supabase
      const { error } = await getSupabase().auth.updateUser({
        data: {
          display_name: displayName,
          phone: phoneNumber
        }
      });

      if (error) throw error;

      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      router.replace('/(authenticated)/(tabs)');
    } catch (error) {
      console.error('Error saving user data:', error);
      Alert.alert('Error', 'Failed to save your profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    const currentStepData = ONBOARDING_STEPS[currentStep];
    
    if (currentStepData.isUserInfo) {
      if (!displayName.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      // Phone is optional
    }

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const renderUserInfoStep = () => (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        placeholder="Your Name"
        value={displayName}
        onChangeText={setDisplayName}
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Phone Number (Optional)"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        editable={!loading}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons 
          name={ONBOARDING_STEPS[currentStep].icon as any} 
          size={80} 
          color="#2196F3" 
        />
        <Text style={styles.title}>{ONBOARDING_STEPS[currentStep].title}</Text>
        <Text style={styles.description}>{ONBOARDING_STEPS[currentStep].description}</Text>
        
        {ONBOARDING_STEPS[currentStep].isUserInfo && renderUserInfoStep()}
      </View>

      <View style={styles.footer}>
        <View style={styles.indicators}>
          {ONBOARDING_STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentStep && styles.activeIndicator
              ]}
            />
          ))}
        </View>

        <Pressable 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleNext}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {currentStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.body,
    textAlign: 'center',
    color: theme.colors.text.secondary,
    paddingHorizontal: theme.spacing.xl,
  },
  footer: {
    padding: theme.spacing.xl,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  indicator: {
    width: theme.spacing.sm,
    height: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs,
  },
  activeIndicator: {
    backgroundColor: theme.colors.primary,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  form: {
    width: '100%',
    paddingHorizontal: theme.spacing.xl,
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.body.fontSize,
    backgroundColor: theme.colors.surface,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
}); 