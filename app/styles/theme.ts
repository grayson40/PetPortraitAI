export const theme = {
  colors: {
    primary: '#000000',
    secondary: '#666666',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    error: '#DC3545',
    text: {
      primary: '#000000',
      secondary: '#666666',
      inverse: '#FFFFFF',
    },
    border: '#EEEEEE',
    warning: '#FF9800',
    success: '#4CAF50',
    info: '#2196F3',
    danger: '#F44336',
    light: '#F5F5F5',
    dark: '#212121',
    muted: '#666666',
    highlight: '#FFEB3B',
    
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    title: {
      fontSize: 28,
      fontWeight: '700' as const,
    },
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400' as const,
    },
  },
  shadows: {
    small: {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 3,
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    large: {
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
  },
} as const;

export type Theme = typeof theme; 