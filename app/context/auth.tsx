import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { router } from 'expo-router';
import { userService } from '../services/user';
import { authService } from '../services/auth';
import { soundService } from '../services/sound';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Add a global flag to track if the app is ready for navigation
let isAppReady = false;

interface AuthState {
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to handle navigation based on auth state
async function handleAuthNavigation(session: Session | null) {
  try {
    // Don't navigate if app isn't ready yet
    if (!isAppReady) {
      console.log('App not ready for navigation yet, deferring navigation');
      return;
    }

    if (session) {
      const needsOnboarding = await AsyncStorage.getItem('needsOnboarding');
      if (needsOnboarding === 'true') {
        console.log('Navigating to onboarding');
        router.replace('/onboarding');
      } else {
        console.log('Navigating to authenticated tabs');
        router.replace('/(authenticated)/(tabs)');
      }
    } else {
      console.log('Navigating to auth');
      router.replace('/(auth)');
    }
  } catch (error) {
    console.error('Navigation error:', error);
    // Don't attempt fallback navigation if the app isn't ready
    if (isAppReady) {
      // Fallback navigation if error occurs
      router.replace('/(auth)');
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    loading: true,
    initialized: false,
  });

  // Set app as ready after initial render
  useEffect(() => {
    // Wait for next render cycle to ensure layout is mounted
    const timer = setTimeout(() => {
      isAppReady = true;
      console.log('App is now ready for navigation');
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      // Set immediate state update regardless of navigation
      setState(prev => ({ 
        ...prev, 
        session,
        loading: session ? true : false 
      }));
      
      if (session) {
        try {
          // Clear existing caches
          await Promise.all([
            userService.clearCache(),
            soundService.clearCache()
          ]).catch(err => console.error('Cache clearing error:', err));

          // Initialize with fresh data - add timeout to prevent hanging
          const initPromise = Promise.all([
            userService.initializeCache(),
            soundService.initialize()
          ]);
          
          // Set a timeout to prevent hanging forever
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Service initialization timed out')), 5000);
          });
          
          await Promise.race([initPromise, timeoutPromise])
            .catch(err => {
              console.warn('Initialization warning (continuing anyway):', err);
              // Continue with authentication even if initialization has issues
            });

          setState({ 
            session, 
            loading: false, 
            initialized: true 
          });
          
          // Handle navigation after successful sign-in
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            console.log('Navigating after auth event:', event);
            // Use setTimeout to give the app a chance to render fully before navigation
            setTimeout(() => handleAuthNavigation(session), 200);
          }
        } catch (error) {
          console.error('Error during auth state change:', error);
          setState({ session, loading: false, initialized: true });
          // Still try to navigate even if there was an error with initialization
          setTimeout(() => handleAuthNavigation(session), 200);
        }
      } else {
        setState({ session: null, loading: false, initialized: true });
        
        // If signed out, ensure we're in the auth screens
        if (event === 'SIGNED_OUT') {
          // Delay navigation slightly to avoid the "navigate before mounting" error
          setTimeout(() => handleAuthNavigation(null), 200);
        }
      }
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        try {
          const initPromise = Promise.all([
            userService.initializeCache(),
            soundService.initialize()
          ]);
          
          // Set a timeout to prevent hanging forever
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Initial session initialization timed out')), 5000);
          });
          
          await Promise.race([initPromise, timeoutPromise])
            .catch(err => {
              console.warn('Initial session warning (continuing anyway):', err);
              // Continue with authentication even if initialization has issues
            });
          
          setState({ session, loading: false, initialized: true });
          
          // Delay initial navigation to prevent "navigate before mounting" error
          setTimeout(() => handleAuthNavigation(session), 500);
        } catch (error) {
          console.error('Error initializing auth session:', error);
          setState({ session, loading: false, initialized: true });
          // Still try to navigate even if there was an error
          setTimeout(() => handleAuthNavigation(session), 500);
        }
      } else {
        setState({ session: null, loading: false, initialized: true });
        // Delay initial navigation to prevent "navigate before mounting" error
        setTimeout(() => handleAuthNavigation(null), 500);
      }
    }).catch(error => {
      console.error('Session check error:', error);
      setState({ session: null, loading: false, initialized: true });
      setTimeout(() => handleAuthNavigation(null), 500);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    ...state,
    signUp: async (email: string, password: string, name: string) => {
      setState(prev => ({ ...prev, loading: true }));
      try {
        const { user, session } = await authService.signUp(email, password, name);
        // Don't set session here - let the auth state change handler do it
        await AsyncStorage.setItem('needsOnboarding', 'true');
        router.replace('/onboarding');
      } catch (error) {
        console.error('Error signing up:', error);
        throw error;
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    },
    signIn: async (email: string, password: string) => {
      setState(prev => ({ ...prev, loading: true }));
      try {
        await authService.signIn(email, password);
        
        // Create a flag to track if auth state change handled the navigation
        let navigationHandled = false;
        
        // Set up a listener to detect when auth state is handled
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'SIGNED_IN') {
            console.log('Auth state change detected in signIn');
            navigationHandled = true;
            subscription.unsubscribe();
          }
        });
        
        // If navigation is slow, manually trigger it after a delay
        const timeout = setTimeout(async () => {
          if (!navigationHandled) {
            console.log('No auth state change detected, manually handling navigation');
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
              console.log('Manual navigation trigger after timeout');
              setState(prev => ({ 
                ...prev, 
                loading: false, 
                session: data.session, 
                initialized: true 
              }));
              
              // Try to navigate
              setTimeout(() => handleAuthNavigation(data.session), 200);
            } else {
              // No session found after timeout, reset loading state
              setState(prev => ({ ...prev, loading: false }));
            }
          }
          
          // Clean up the listener if it wasn't already
          subscription.unsubscribe();
        }, 3000);
        
        // Rather than returning a cleanup function, just clean up in finally block
        setTimeout(() => {
          clearTimeout(timeout);
          subscription.unsubscribe();
        }, 5000);
      } catch (error) {
        console.error('Error signing in:', error);
        setState(prev => ({ ...prev, loading: false }));
        throw error;
      }
    },
    signOut: async () => {
      setState(prev => ({ ...prev, loading: true }));
      try {
        await authService.signOut();
        // Navigation will be handled by auth state change
      } catch (error) {
        console.error('Error signing out:', error);
        throw error;
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    },
    deleteAccount: async () => {
      setState(prev => ({ ...prev, loading: true }));
      try {
        await authService.deleteAccount();
        // Navigation will be handled by auth state change
      } catch (error) {
        console.error('Error deleting account:', error);
        throw error;
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 