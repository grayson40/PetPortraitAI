import { Slot, useSegments, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/auth';
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from './constants/config';

function ProtectedLayout() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to login if no session and not already in auth group
      router.replace('/(auth)/login');
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