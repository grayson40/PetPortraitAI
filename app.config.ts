import 'dotenv/config';

export default {
  expo: {
    name: 'PetPortrait',
    slug: 'pet-portrait',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      "**/*",
      "assets/sounds/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yourcompany.petportrait'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.yourcompany.petportrait'
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
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
        projectId: process.env.EAS_PROJECT_ID || 'your-project-id'
      },
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    },
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true
    }
  }
}; 