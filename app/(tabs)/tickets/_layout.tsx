import { Stack } from 'expo-router';

export default function TicketsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Mis Tickets' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del Ticket' }} />
    </Stack>
  );
}
