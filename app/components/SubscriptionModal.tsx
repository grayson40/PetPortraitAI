import React from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { useState } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from '../constants/config';
import { getSupabase } from '../services/supabase';
import { API_CONFIG } from '../constants/config';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  currentTier: 'basic' | 'premium';
  loading?: boolean;
}

const SUBSCRIPTION_PRICES = {
  monthly: {
    price: 4.99,
    id: STRIPE_CONFIG.monthlyPriceId,
  },
  yearly: {
    price: 47.99, // Clean up the decimal
    id: STRIPE_CONFIG.yearlyPriceId,
    savings: '20%',
    monthlyEquivalent: 3.99, // Show the monthly breakdown
  },
};

type ModalView = 'overview' | 'payment';

export default function SubscriptionModal({ visible, onClose, currentTier, loading = false }: SubscriptionModalProps) {
  const [modalView, setModalView] = useState<ModalView>('overview');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const PREMIUM_FEATURES = [
    { id: '1', text: 'Access to premium sounds', icon: 'music-note' as const },
    { id: '2', text: 'Unlimited sound collections', icon: 'library-music' as const },
    { id: '3', text: 'Advanced pet detection', icon: 'pets' as const },
    { id: '4', text: 'Priority support', icon: 'support-agent' as const },
  ];

  const handleClose = () => {
    setModalView('overview');
    setSelectedPlan('monthly');
    onClose();
  };

  const handleContinueToPayment = async () => {
    try {
      const initialized = await initializePayment();
      if (!initialized) return;
      setModalView('payment');
    } catch (error) {
      console.error('Error initializing payment:', error);
      Alert.alert('Error', 'Failed to initialize payment');
    }
  };

  const initializePayment = async () => {
    try {
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch(`${API_CONFIG.url}/subscription/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const { clientSecret, ephemeralKey, customer } = await response.json();

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'PetPortrait',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: clientSecret,
        defaultBillingDetails: {
          email: user.email,
        },
        allowsDelayedPaymentMethods: true,
      });

      if (initError) throw new Error(initError.message);
      return true;
    } catch (error) {
      console.error('Error initializing payment:', error);
      Alert.alert('Error', 'Failed to initialize payment');
      return false;
    }
  };

  const handlePaymentSubmit = async () => {
    try {
      const initialized = await initializePayment();
      if (!initialized) return;

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) throw new Error(presentError.message);

      Alert.alert('Success', 'Welcome to Premium!');
      handleClose();
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment');
    }
  };

  const renderOverview = () => (
    <>
      <View style={styles.header}>
        <MaterialIcons name="star" size={32} color={theme.colors.primary} />
        <Text style={styles.title}>Upgrade to Premium</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <MaterialIcons name="close" size={24} color={theme.colors.text.secondary} />
        </Pressable>
      </View>

      {/* Plans */}
      <View style={styles.plans}>
        <Pressable
          style={[styles.planCard, selectedPlan === 'monthly' && styles.selectedPlan]}
          onPress={() => setSelectedPlan('monthly')}
        >
          <Text style={styles.planName}>Monthly</Text>
          <Text style={styles.planPrice}>
            ${SUBSCRIPTION_PRICES.monthly.price}
            <Text style={styles.perMonth}>/month</Text>
          </Text>
        </Pressable>

        <Pressable
          style={[styles.planCard, selectedPlan === 'yearly' && styles.selectedPlan]}
          onPress={() => setSelectedPlan('yearly')}
        >
          <View style={styles.savingsBadge}>
            <MaterialIcons 
              name="local-offer" 
              size={10} 
              color={theme.colors.text.inverse} 
              style={styles.savingsIcon}
            />
            <Text style={styles.savingsText}>Save 20%</Text>
          </View>
          <Text style={styles.planName}>Yearly</Text>
          <Text style={styles.planPrice}>
            ${SUBSCRIPTION_PRICES.yearly.price}
            <Text style={styles.perMonth}>/year</Text>
          </Text>
        </Pressable>
      </View>

      {/* Features */}
      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>Premium Features</Text>
        {PREMIUM_FEATURES.map((feature) => (
          <View key={feature.id} style={styles.featureItem}>
            <MaterialIcons name={feature.icon} size={24} color={theme.colors.primary} />
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>

      {/* Action Button */}
      {currentTier !== 'premium' && (
        <Pressable 
          style={[styles.upgradeButton, loading && styles.upgradeButtonDisabled]}
          onPress={handleContinueToPayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.text.inverse} />
          ) : (
            <Text style={styles.upgradeButtonText}>
              Continue with {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'} Plan
            </Text>
          )}
        </Pressable>
      )}
    </>
  );

  const renderPayment = () => (
    <>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => setModalView('overview')}>
          <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.secondary} />
        </Pressable>
        <Text style={styles.title}>Confirm Payment</Text>
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <MaterialIcons name="close" size={24} color={theme.colors.text.secondary} />
        </Pressable>
      </View>

      <View style={styles.paymentSummary}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>
            Premium Plan ({selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'})
          </Text>
          <Text style={styles.summaryAmount}>
            ${SUBSCRIPTION_PRICES[selectedPlan].price}
          </Text>
        </View>
      </View>

      <Pressable 
        style={[styles.upgradeButton, loading && styles.upgradeButtonDisabled]}
        onPress={handlePaymentSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.text.inverse} />
        ) : (
          <Text style={styles.upgradeButtonText}>
            Pay ${SUBSCRIPTION_PRICES[selectedPlan].price}
          </Text>
        )}
      </Pressable>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.dismissArea} onPress={handleClose} />
        <View style={styles.bottomSheet}>
          <View style={styles.dragIndicator} />
          <ScrollView style={styles.content}>
            {modalView === 'overview' ? renderOverview() : renderPayment()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: theme.spacing.md,
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginLeft: theme.spacing.md,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  currentPlan: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
  },
  planLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  planName: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  featuresSection: {
    marginBottom: theme.spacing.xl,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  featureText: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  pricingSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  period: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.text.secondary,
  },
  priceSubtext: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  upgradeButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  upgradeButtonText: {
    color: theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  upgradeButtonDisabled: {
    opacity: 0.7,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  paymentSummary: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
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
    top: -8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
    ...theme.shadows.small,
  },
  savingsIcon: {
    marginRight: 3,
  },
  savingsText: {
    color: theme.colors.text.inverse,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
}); 