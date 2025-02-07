import { Tabs, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Pressable } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={({ navigation }) => ({
          title: 'Feed',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="photo-library" size={24} color={color} />
          ),
          headerRight: () => (
            <Pressable 
              onPress={() => router.setParams({ 
                showSearch: 'true',
                source: 'searchIcon' 
              })}
              style={{ marginRight: 16 }}
            >
              <MaterialIcons name="search" size={24} color={theme.colors.primary} />
            </Pressable>
          ),
        })}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Camera',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="camera-alt" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="person" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
} 