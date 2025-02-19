import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { theme } from '../styles/theme';

interface LoadingIndicatorProps {
  message?: string;
  size?: number;
  color?: string;
}

export default function LoadingIndicator({ 
  message = 'Loading...',
  size = 40, 
  color = theme.colors.primary 
}: LoadingIndicatorProps) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <MaterialIcons name="pets" size={size} color={color} />
      </Animated.View>
      <Text style={styles.text}>{message}</Text>
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