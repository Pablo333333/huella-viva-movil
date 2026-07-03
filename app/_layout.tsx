import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const queryClient = new QueryClient();
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { initDatabase } from '@/lib/database';
import { SyncIndicator } from '@/components/SyncIndicator';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { logError } from '@/lib/logger';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'login',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [initError, setInitError] = useState<string | null>(null);

  try {
    const [loaded, error] = useFonts({
      SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    // Expo Router uses Error Boundaries to catch errors in the navigation tree.
    useEffect(() => {
      if (error) {
        logError(error);
        setInitError(`Error de fuentes: ${error.message}`);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, [error]);

    useEffect(() => {
      async function initialize() {
        try {
          console.log('[RootLayout] Starting initialization...');
          await initDatabase();
          console.log('[RootLayout] Database initialized');
        } catch (e: any) {
          console.error('[RootLayout] Initialization error:', e);
          logError(e);
          setInitError(`Error de inicialización: ${e.message || String(e)}`);
        } finally {
          // Always try to hide the splash screen once we've attempted initialization
          if (loaded || initError) {
            await SplashScreen.hideAsync().catch(() => {});
            console.log('[RootLayout] Splash screen hidden (Final)');
          }
        }
      }
      initialize();
    }, [loaded, initError]);

    if (initError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>ERROR CRÍTICO</Text>
          <Text style={styles.errorText}>{initError}</Text>
        </View>
      );
    }

    if (!loaded) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando recursos...</Text>
        </View>
      );
    }

    return (
      <GlobalErrorBoundary>
        <RootLayoutNav />
      </GlobalErrorBoundary>
    );
  } catch (fatalError: any) {
    console.error('[RootLayout] Fatal Crash:', fatalError);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>ERROR CRÍTICO (FATAL)</Text>
        <Text style={styles.errorText}>{fatalError?.toString() || 'Error desconocido'}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fee2e2',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#b91c1c',
    textAlign: 'center',
  },
});

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SyncIndicator />
        <Stack>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="new-ticket" options={{ 
            title: 'Nuevo Ticket',
            presentation: 'modal',
            headerShown: true
          }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
