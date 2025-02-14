import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../../../styles/theme';
import { UserService } from '../../../services/user';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onFilterPress: () => void;
  isPremium: boolean;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export function Header({ onFilterPress, isPremium }: HeaderProps) {
  const [displayName, setDisplayName] = useState('there');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userService = UserService.getInstance();
        const profile = await userService.getUserProfile();
        if (profile?.display_name) {
          setDisplayName(profile.display_name.split(' ')[0]);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, []);

  return (
    <View style={styles.header}>
      <View style={styles.titleContainer}>
        <Text style={styles.greeting}>
          {getGreeting()}, {displayName}! 👋
        </Text>
        <Text style={styles.subtitle}>
          Ready to play some sounds?
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 24 : theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  titleContainer: {
    gap: theme.spacing.xs,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  actionButton: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
  },
}); 