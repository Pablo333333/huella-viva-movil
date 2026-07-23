import { Redirect } from 'expo-router';

export default function Index() {
  console.log('[Index] Root path reached, executing redirect to /(tabs)');
  // Simplemente redirigimos al grupo de tabs. 
  // El AuthProvider en _layout.tsx se encargará de interceptar esto y mandar a login si no hay sesión.
  return <Redirect href="/(tabs)" />; 
}
