import React from 'react';
import { Stack, useGlobalSearchParams, router } from 'expo-router';
import { theme } from '../styles/theme';
import { useState, useEffect } from 'react';
import SearchSheet from '../components/SearchSheet';

export default function AuthenticatedLayout() {
  const [showSearch, setShowSearch] = useState(false);
  const params = useGlobalSearchParams();

  useEffect(() => {
    if (params.showSearch === 'true' && params.source === 'searchIcon') {
      setShowSearch(true);
    }
  }, [params.showSearch, params.source]);

  const handleCloseSearch = () => {
    setShowSearch(false);
    router.setParams({ 
      showSearch: 'false',
      source: undefined 
    });
  };

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="photo/[id]"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Photo Details',
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.primary,
          }}
        />
      </Stack>

      <SearchSheet
        visible={showSearch}
        onClose={handleCloseSearch}
        onSoundSelect={() => {}}
      />
    </>
  );
} 