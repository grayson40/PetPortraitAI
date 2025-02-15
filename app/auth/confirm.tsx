import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../services/supabase';
import { theme } from '../styles/theme';

export default function ConfirmEmail() {
  const { access_token, refresh_token } = useLocalSearchParams();

  useEffect(() => {
    const handleConfirmation = async () => {
      if (access_token && refresh_token) {
        const { data: { session }, error } = await supabase.auth.setSession({
          access_token: access_token as string,
          refresh_token: refresh_token as string,
        });

        if (error) {
          console.error('Error setting session:', error);
          router.replace('/(auth)');
          return;
        }

        if (session) {
          router.replace('/onboarding');
        }
      }
    };

    handleConfirmation();
  }, [access_token, refresh_token]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
} 