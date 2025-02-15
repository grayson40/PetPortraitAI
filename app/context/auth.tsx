import { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { router } from 'expo-router';
import { userService } from '../services/user';
import { authService } from '../services/auth';
import { soundService } from '../services/sound';

interface AuthState {
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    loading: true,
    initialized: false,
  });

  useEffect(() => {
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      if (session) {
        try {
          // Clear existing caches
          await userService.clearCache();
          await soundService.clearCache();

          // Initialize with fresh data
          await userService.initializeCache();
          await soundService.initialize();

          setState({ 
            session, 
            loading: false, 
            initialized: true 
          });
        } catch (error) {
          console.error('Error initializing auth:', error);
          setState({ session: null, loading: false, initialized: true });
        }
      } else {
        setState({ session: null, loading: false, initialized: true });
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        Promise.all([
          userService.initializeCache(),
          soundService.initialize()
        ])
          .then(() => {
            setState({ session, loading: false, initialized: true });
          })
          .catch((error) => {
            console.error('Error initializing auth:', error);
            setState({ session: null, loading: false, initialized: true });
          });
      } else {
        setState({ session: null, loading: false, initialized: true });
      }
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
        const { data } = await authService.signUp(email, password, name);
        // Don't set session here - let the auth state change handler do it
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
      } catch (error) {
        console.error('Error signing in:', error);
        throw error;
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    },
    signOut: async () => {
      setState(prev => ({ ...prev, loading: true }));
      try {
        await authService.signOut();
      } catch (error) {
        console.error('Error signing out:', error);
        throw error;
      } finally {
        setState(prev => ({ ...prev, loading: false }));
      }
    },
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