import { Stack } from 'expo-router';
import { theme } from '../../../styles/theme';

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="edit"
        options={{
          presentation: 'modal',
          headerTitle: 'Edit Profile',
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.primary,
        }}
      />
    </Stack>
  );
} 