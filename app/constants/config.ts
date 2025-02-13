import Constants from 'expo-constants';

export const API_CONFIG = {
  url: Constants.expoConfig?.extra?.apiUrl as string,
};

export const SUPABASE_CONFIG = {
  url: Constants.expoConfig?.extra?.supabaseUrl as string,
  anonKey: Constants.expoConfig?.extra?.supabaseAnonKey as string,
};

export const SUBSCRIPTION_TIERS = {
  basic: {
    price: 19.99,
    photoLimit: 50,
  },
  premium: {
    price: 39.99,
    photoLimit: 'unlimited',
  },
};

export const STRIPE_CONFIG = {
  publishableKey: Constants.expoConfig?.extra?.stripePublishableKey as string,
  merchantIdentifier: Constants.expoConfig?.extra?.stripeMerchantIdentifier as string,
  monthlyPriceId: Constants.expoConfig?.extra?.stripePriceIdMonthly as string,
  yearlyPriceId: Constants.expoConfig?.extra?.stripePriceIdYearly as string,
};

export const CAMERA_CONFIG = {
  aspectRatio: '4:3',
  quality: 0.8,
  allowsEditing: false,
  mediaTypes: 'Images',
}; 