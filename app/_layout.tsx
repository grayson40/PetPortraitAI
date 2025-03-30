import { Slot, useSegments, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/auth';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from './constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

function ProtectedLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationAttempted = useRef(false);

  useEffect(() => {
    if (loading) {
      console.log('Auth loading, waiting...');
      return;
    }

    const checkAuthAndOnboarding = async () => {
      try {
        const inAuthGroup = segments[0] === '(auth)';
        const inOnboardingGroup = segments[0] === 'onboarding';
        const needsOnboarding = await AsyncStorage.getItem('needsOnboarding');

        console.log('Auth check - Session:', !!session, 'InAuth:', inAuthGroup, 'InOnboarding:', inOnboardingGroup, 'NeedsOnboarding:', needsOnboarding);

        // Prevent multiple navigation attempts in the same render cycle
        if (navigationAttempted.current) {
          console.log('Navigation already attempted, skipping');
          return;
        }

        if (!session && !inAuthGroup) {
          // Redirect to login if no session
          console.log('No session, redirecting to auth');
          navigationAttempted.current = true;
          setTimeout(() => {
            router.replace('/(auth)');
            navigationAttempted.current = false;
          }, 100);
        } else if (session) {
          if (needsOnboarding === 'true' && !inOnboardingGroup) {
            // Only show onboarding if flag is set and not already there
            console.log('Needs onboarding, redirecting to onboarding');
            navigationAttempted.current = true;
            setTimeout(() => {
              router.replace('/onboarding');
              navigationAttempted.current = false;
            }, 100);
          } else if (needsOnboarding !== 'true' && inAuthGroup) {
            // If we have a session and don't need onboarding, go to main app
            console.log('Session active, redirecting to main app');
            navigationAttempted.current = true;
            setTimeout(() => {
              router.replace('/(authenticated)/(tabs)');
              navigationAttempted.current = false;
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        // Fallback to auth screen on error
        navigationAttempted.current = true;
        setTimeout(() => {
          router.replace('/(auth)');
          navigationAttempted.current = false;
        }, 100);
      }
    };

    checkAuthAndOnboarding();
  }, [session, loading, segments]);

  // Show a loading indicator during auth state transitions
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  // Disable router animations to reduce chance of navigation errors
  useEffect(() => {
    // This will run once when the root layout component mounts
    console.log('Root layout mounted and ready for navigation');
  }, []);

  return (
    <StripeProvider
      publishableKey={STRIPE_CONFIG.publishableKey}
      merchantIdentifier={STRIPE_CONFIG.merchantIdentifier || ''}
    >
      <AuthProvider>
        <ProtectedLayout />
      </AuthProvider>
    </StripeProvider>
  );
} 