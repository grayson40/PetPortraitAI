import { View, Text, StyleSheet, Pressable, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { theme } from '../../../styles/theme';
import { getSupabase } from '../../../services/supabase';
import { API_CONFIG } from '../../../constants/config';
import { initStripe, useStripe } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from '../../../constants/config';

const SUBSCRIPTION_PRICES = {
  monthly: {
    price: 9.99,
    id: STRIPE_CONFIG.monthlyPriceId,
  },
  yearly: {
    price: 99.99,
    id: STRIPE_CONFIG.yearlyPriceId,
    savings: '17%',
  },
};

export default function Subscription() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const { tier } = useLocalSearchParams<{ tier: string }>();

  const initializePayment = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      // Get payment intent from backend
      const response = await fetch(`${API_CONFIG.url}/subscription/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlan, // Send plan instead of priceId
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const { clientSecret, ephemeralKey, customer, subscription } = await response.json();

      // Initialize the Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'PetPortrait',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          email: user.email,
        },
        allowsDelayedPaymentMethods: true,
        returnURL: 'petportrait://subscription-return',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      return true;
    } catch (error) {
      console.error('Error initializing payment:', error);
      Alert.alert('Error', error.message || 'Failed to initialize payment');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);

      // Make sure payment sheet is initialized
      const initialized = await initializePayment();
      if (!initialized) return;

      // Present the payment sheet
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        throw new Error(presentError.message);
      }

      // Payment successful - subscription will be activated via webhook
      Alert.alert('Success', 'Welcome to Premium!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', error.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upgrade to Premium</Text>
        <Text style={styles.subtitle}>Unlock all premium features</Text>
      </View>

      {/* Plan Selection */}
      <View style={styles.plans}>
        <Pressable
          style={[
            styles.planCard,
            selectedPlan === 'monthly' && styles.selectedPlan
          ]}
          onPress={() => setSelectedPlan('monthly')}
        >
          <Text style={styles.planName}>Monthly</Text>
          <Text style={styles.planPrice}>
            ${SUBSCRIPTION_PRICES.monthly.price}
            <Text style={styles.perMonth}>/month</Text>
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.planCard,
            selectedPlan === 'yearly' && styles.selectedPlan
          ]}
          onPress={() => setSelectedPlan('yearly')}
        >
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Save {SUBSCRIPTION_PRICES.yearly.savings}</Text>
          </View>
          <Text style={styles.planName}>Yearly</Text>
          <Text style={styles.planPrice}>
            ${SUBSCRIPTION_PRICES.yearly.price}
            <Text style={styles.perMonth}>/year</Text>
          </Text>
        </Pressable>
      </View>

      {/* Features List */}
      <View style={styles.features}>
        <Text style={styles.featuresTitle}>Premium Features</Text>
        <View style={styles.featureItem}>
          <MaterialIcons name="check" size={20} color={theme.colors.success} />
          <Text style={styles.featureText}>Access to premium sounds</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialIcons name="check" size={20} color={theme.colors.success} />
          <Text style={styles.featureText}>Unlimited sound collections</Text>
        </View>
        <View style={styles.featureItem}>
          <MaterialIcons name="check" size={20} color={theme.colors.success} />
          <Text style={styles.featureText}>Advanced pet detection</Text>
        </View>
      </View>

      {/* Subscribe Button */}
      <Pressable
        style={[styles.subscribeButton, loading && styles.buttonDisabled]}
        onPress={handleSubscribe}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.text.inverse} />
        ) : (
          <Text style={styles.subscribeButtonText}>
            Subscribe for ${SUBSCRIPTION_PRICES[selectedPlan].price}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  plans: {
    padding: theme.spacing.lg,
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  planCard: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  selectedPlan: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  planName: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  planPrice: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
  },
  perMonth: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  savingsBadge: {
    position: 'absolute',
    top: -12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.success,
    borderRadius: theme.borderRadius.full,
  },
  savingsText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  features: {
    padding: theme.spacing.lg,
  },
  featuresTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  featureText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.primary,
  },
  subscribeButton: {
    margin: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  subscribeButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
}); 