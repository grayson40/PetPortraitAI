import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { theme } from '../styles/theme';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const FEATURES = [
  {
    icon: 'camera',
    title: 'Smart Pet Camera',
    description: 'AI-powered camera that captures the perfect moment'
  },
  {
    icon: 'music-note',
    title: 'Attention Sounds',
    description: 'Curated sounds to grab your pet\'s attention'
  },
  {
    icon: 'collections',
    title: 'Photo Collections',
    description: 'Organize and share your pet photos easily'
  }
];

export default function LandingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PetPortraitAI</Text>
        <Text style={styles.subtitle}>The AI-powered pet photography assistant</Text>
      </View>

      <View style={styles.features}>
        {FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <MaterialIcons name={feature.icon} size={32} color={theme.colors.primary} />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable 
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </Pressable>

        <Pressable 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            I already have an account
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
  },
  features: {
    flex: 1,
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  featureDescription: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  actions: {
    gap: theme.spacing.md,
  },
  button: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  buttonText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text.inverse,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
}); 