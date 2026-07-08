import { Redirect } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  useEffect(() => {
    console.log('[Index] Root index mounted, AuthProvider should handle redirection');
  }, []);
  
  // El AuthProvider en _layout.tsx se encarga de redirigir según la sesión.
  // Pero necesitamos este archivo para que expo-router reconozca la ruta raíz.
  return null; 
}
