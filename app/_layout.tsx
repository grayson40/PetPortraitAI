import { Slot, useSegments, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/auth';
import { View, ActivityIndicator } from 'react-native';
import { theme } from './styles/theme';
import { initializeSupabase } from './services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from './constants/config';
// Initialize Supabase on app start
initializeSupabase();

function ProtectedLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === 'onboarding';

    if (!session) {
      // Redirect to login if not authenticated
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      // Check onboarding status when authenticated
      AsyncStorage.getItem('hasCompletedOnboarding').then(hasCompleted => {
        if (!hasCompleted && !inOnboardingGroup) {
          router.replace('/onboarding');
        } else if (hasCompleted && (inAuthGroup || inOnboardingGroup)) {
          router.replace('/(authenticated)/');
        }
      });
    }
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