import { Slot, useSegments, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/auth';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from './constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

function ProtectedLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const checkAuthAndOnboarding = async () => {
      const inAuthGroup = segments[0] === '(auth)';
      const needsOnboarding = await AsyncStorage.getItem('needsOnboarding');

      if (!session && !inAuthGroup) {
        // Redirect to login if no session
        router.replace('/(auth)');
      } else if (session) {
        if (needsOnboarding === 'true' && segments[0] !== 'onboarding') {
          // Only show onboarding if flag is set and not already there
          router.replace('/onboarding');
        } else if (!needsOnboarding && inAuthGroup) {
          // If we have a session and don't need onboarding, go to main app
          router.replace('/(authenticated)/(tabs)');
        }
      }
    };

    checkAuthAndOnboarding();
  }, [session, loading, segments]);

  return <Slot />;
}

export default function RootLayout() {
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