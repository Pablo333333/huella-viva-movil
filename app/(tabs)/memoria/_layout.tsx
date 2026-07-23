import { Stack } from 'expo-router';

export default function MemoriaLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTitleStyle: { fontWeight: 'bold', color: '#1e293b' },
        headerTintColor: '#1e293b',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Memoria Viva',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Detalle de Actividad',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
