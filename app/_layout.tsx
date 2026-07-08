import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useMemo } from 'react';

const queryClient = new QueryClient();
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from '@/components/useColorScheme';
import { initDatabase } from '@/lib/database';
import { SyncIndicator } from '@/components/SyncIndicator';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
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
  const [dbReady, setDbReady] = useState(false);

  return (
    <GlobalErrorBoundary>
      <RootLayoutContent 
        initError={initError} 
        setInitError={setInitError}
        dbReady={dbReady}
        setDbReady={setDbReady}
      />
    </GlobalErrorBoundary>
  );
}

function RootLayoutContent({ 
  initError, 
  setInitError, 
  dbReady, 
  setDbReady 
}: { 
  initError: string | null, 
  setInitError: (err: string | null) => void,
  dbReady: boolean,
  setDbReady: (ready: boolean) => void
}) {
  try {
    const [fontsLoaded, fontError] = useFonts({
      SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    // Capturar errores de fuentes
    useEffect(() => {
      if (fontError) {
        logError(fontError);
        setInitError(`Error de fuentes: ${fontError.message}`);
        SplashScreen.hideAsync().catch(() => {});
      }
    }, [fontError]);

    // Inicialización secuencial y protegida
    useEffect(() => {
      async function initialize() {
        try {
          console.log('[RootLayout] Starting initialization...');
          
          // 1. Dar un respiro inicial antes de tocar la DB para evitar saturación nativa
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await initDatabase();
          console.log('[RootLayout] Database initialized');
          setDbReady(true);
          
          // 2. Si las fuentes ya están, ocultar splash
          if (fontsLoaded) {
            await SplashScreen.hideAsync();
            console.log('[RootLayout] Splash screen hidden');
          }
        } catch (e: any) {
          console.error('[RootLayout] Initialization error:', e);
          logError(e);
          setInitError(`Error de inicialización: ${e.message || String(e)}`);
          await SplashScreen.hideAsync().catch(() => {});
        }
      }
      initialize();
    }, [fontsLoaded]);

    if (initError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>ERROR CRÍTICO</Text>
          <Text style={styles.errorText}>{initError}</Text>
        </View>
      );
    }

    if (!loaded) {
      console.log('[RootLayout] Fonts NOT loaded yet');
    // Mientras cargan fuentes o DB, mostramos un spinner para mantener la UI activa
    if (!fontsLoaded || !dbReady) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando Kontrolia...</Text>
          {!dbReady && <Text style={styles.loadingSubtext}>Preparando base de datos...</Text>}
        </View>
      );
    }

    console.log('[RootLayout] Fonts LOADED, proceeding to render RootLayoutNav');
    return <RootLayoutNav />;
    return <RootLayoutNav />;
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 12,
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
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SyncIndicator />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="new-ticket" options={{ 
              title: 'Nuevo Ticket',
              presentation: 'modal',
              headerShown: true
            }} />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
