import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../services/supabase';
import { theme } from '../styles/theme';

export default function ConfirmEmail() {
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleConfirmation = async () => {
      try {
        // Log params to debug
        console.log('Auth params:', params);

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session error:', error);
          router.replace('/(auth)');
          return;
        }

        if (session) {
          console.log('Session found, redirecting to onboarding');
          router.replace('/onboarding');
        } else {
          console.log('No session found, redirecting to login');
          router.replace('/(auth)');
        }
      } catch (error) {
        console.error('Confirmation error:', error);
        router.replace('/(auth)');
      }
    };

    handleConfirmation();
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.text}>Confirming your email...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    gap: theme.spacing.lg,
  },
  text: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
}); 