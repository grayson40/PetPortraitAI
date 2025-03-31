import 'dotenv/config';

export default {
  expo: {
    name: 'Pet Portrait',
    slug: 'pet-portrait',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './app/assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './app/assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      "**/*",
      "assets/sounds/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.toro.petportrait'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './app/assets/icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.toro.petportrait'
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'onnxruntime-react-native',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera to take pet photos.'
        }
      ],
      [
        'expo-media-library',
        {
          photosPermission: 'Allow $(PRODUCT_NAME) to access your photos.',
          savePhotosPermission: 'Allow $(PRODUCT_NAME) to save photos.',
          isAccessMediaLocationEnabled: true
        }
      ]
    ],
    scheme: 'petportrait',
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID
      },
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      apiUrl: process.env.API_URL,
      stripePriceIdMonthly: process.env.STRIPE_PRICE_ID_MONTHLY,
      stripePriceIdYearly: process.env.STRIPE_PRICE_ID_YEARLY,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      stripeMerchantIdentifier: process.env.STRIPE_MERCHANT_IDENTIFIER,
    },
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true
    }
  }
}; 