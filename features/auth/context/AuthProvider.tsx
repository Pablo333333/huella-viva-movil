import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import { AuthUser } from '../roles';

interface AuthContextType {
  session: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (token: string, user: AuthUser) => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('[AuthProvider] Rendering Provider');
  const [session, setSession] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function loadSession() {
      try {
        const token = await SecureStore.getItemAsync('token');
        const userData = await SecureStore.getItemAsync('user');
        
        if (token) {
          setSession(token);
          if (userData) setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error('[AuthProvider] Error loading session:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isLoginPage = segments[0] === 'login';

    console.log('[AuthProvider] Auth State Check:', {
      hasSession: !!session,
      inAuthGroup,
      isLoginPage,
      segments
    });

    if (!session && !isLoginPage) {
      // Si no hay sesión y no estamos ya en login, vamos a login
      console.log('[AuthProvider] No session, redirecting to login');
      router.replace('/login');
    } else if (session && isLoginPage) {
      // Si hay sesión y estamos en login, vamos a las tabs
      console.log('[AuthProvider] Session found, redirecting to tabs');
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments]);

  const signIn = async (token: string, userData: AuthUser) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    setSession(token);
    setUser(userData);
  };

  const updateUser = async (patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      SecureStore.setItemAsync('user', JSON.stringify(next)).catch((err) => {
        console.error('[AuthProvider] Error updating user', err);
      });
      return next;
    });
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signIn, updateUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
