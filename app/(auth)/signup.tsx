import { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { theme } from '../styles/theme';
import { useAuth } from '../context/auth';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Step = 'name' | 'email' | 'password';

export default function SignUp() {
  const [step, setStep] = useState<Step>('name');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const slideX = useRef(new Animated.Value(0)).current;
  const inputScale = useRef(new Animated.Value(1)).current;
  const titleOpacity = useRef(new Animated.Value(1)).current;

  const animateToNextStep = (nextStep: Step) => {
    Haptics.selectionAsync();
    
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(titleOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(inputScale, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep(nextStep);
      slideX.setValue(50);
      inputScale.setValue(0.95);
      
      Animated.parallel([
        Animated.spring(slideX, {
          toValue: 0,
          speed: 20,
          bounciness: 8,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(inputScale, {
          toValue: 1,
          speed: 20,
          bounciness: 8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const validateAndNext = () => {
    switch (step) {
      case 'name':
        if (!name.trim()) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Error', 'Please enter your name');
          return;
        }
        animateToNextStep('email');
        break;
      case 'email':
        if (!email.trim() || !EMAIL_REGEX.test(email)) {
          Alert.alert('Error', 'Please enter a valid email');
          return;
        }
        animateToNextStep('password');
        break;
      case 'password':
        if (password.length < 6) {
          Alert.alert('Error', 'Password must be at least 6 characters');
          return;
        }
        handleSubmit();
        break;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await signUp(email.trim(), password, name.trim());
      Keyboard.dismiss();
    } catch (error) {
      console.error('Signup error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    const stepContent = {
      name: {
        icon: 'person-outline',
        title: "Hi! What's your name?",
        subtitle: "Let's personalize your experience",
        placeholder: "Enter your name",
        returnKeyType: 'next',
      },
      email: {
        icon: 'mail-outline',
        title: "What's your email?",
        subtitle: "You'll use this to sign in",
        placeholder: "Enter your email",
        returnKeyType: 'next',
      },
      password: {
        icon: 'lock-outline',
        title: "Create a password",
        subtitle: "Use at least 6 characters",
        placeholder: "Enter your password",
        returnKeyType: 'done',
      },
    };

    const content = stepContent[step];

    return (
      <>
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateX: slideX }],
          }}
        >
          <View style={styles.iconContainer}>
            <MaterialIcons 
              name={content.icon} 
              size={32} 
              color={theme.colors.primary} 
            />
          </View>
          <Text style={styles.title}>{content.title}</Text>
          <Text style={styles.subtitle}>{content.subtitle}</Text>
        </Animated.View>
        
        <Animated.View
          style={{
            transform: [
              { translateX: slideX },
              { scale: inputScale }
            ],
          }}
        >
          <View style={styles.inputWrapper}>
            <MaterialIcons 
              name={content.icon} 
              size={24} 
              color={theme.colors.text.secondary} 
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder={content.placeholder}
              value={step === 'name' ? name : step === 'email' ? email : password}
              onChangeText={step === 'name' ? setName : step === 'email' ? setEmail : setPassword}
              autoCapitalize={step === 'name' ? "words" : "none"}
              keyboardType={step === 'email' ? "email-address" : "default"}
              secureTextEntry={step === 'password'}
              editable={!loading}
              onSubmitEditing={validateAndNext}
              returnKeyType={content.returnKeyType}
              autoFocus={true}
              enablesReturnKeyAutomatically={true}
              placeholderTextColor={theme.colors.text.secondary + '80'}
            />
          </View>
        </Animated.View>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.formContainer}>
          {renderStep()}
        </View>

        <View style={styles.buttonContainer}>
          <Pressable 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={validateAndNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.text.inverse} />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {step === 'password' ? 'Create Account' : 'Continue'}
                </Text>
                <MaterialIcons 
                  name="arrow-forward" 
                  size={20} 
                  color={theme.colors.text.inverse} 
                  style={styles.buttonIcon}
                />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    marginLeft: theme.spacing.lg,
    opacity: 0.5,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  elevatedInput: {
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonContainer: {
    padding: theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: Platform.OS === 'ios' ? 16 : 14,
    borderRadius: theme.borderRadius.full,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginLeft: theme.spacing.sm,
  },
}); 