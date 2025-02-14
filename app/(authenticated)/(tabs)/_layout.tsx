import React from 'react';
import { Tabs, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';
import { Pressable, View } from 'react-native';
import { useState, useCallback } from 'react';
import FilterSheet from '../../components/FilterSheet';

export default function TabsLayout() {
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const handleApplyFilters = useCallback((filters: string[]) => {
    setActiveFilters(filters);
    setHasActiveFilters(filters.length > 0);
    setIsFilterSheetVisible(false);
  }, []);

  return (
    <>
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
            title: 'Sounds',
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="music-note" size={24} color={color} />
            ),
            headerRight: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 16 }}>
                <Pressable 
                  style={({ pressed }) => ({
                    padding: 8,
                    backgroundColor: hasActiveFilters ? theme.colors.primary + '10' : theme.colors.surface,
                    borderRadius: 20,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  onPress={() => setIsFilterSheetVisible(true)}
                >
                  <MaterialIcons 
                    name="tune" 
                    size={20} 
                    color={hasActiveFilters ? theme.colors.primary : theme.colors.text.secondary} 
                  />
                </Pressable>
                
                <Pressable 
                  onPress={() => router.setParams({ 
                    showSearch: 'true',
                    source: 'searchIcon' 
                  })}
                >
                  <MaterialIcons name="search" size={24} color={theme.colors.primary} />
                </Pressable>
              </View>
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

      <FilterSheet
        visible={isFilterSheetVisible}
        onClose={() => setIsFilterSheetVisible(false)}
        onApply={handleApplyFilters}
        selectedFilters={activeFilters}
      />
    </>
  );
} 