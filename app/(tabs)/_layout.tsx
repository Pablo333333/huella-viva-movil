import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { isCommunityRole } from '@/features/auth/roles';

const ACTIVE_COLOR = '#1E3A8A';
const INACTIVE_COLOR = '#94A3B8';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isCommunity = isCommunityRole(user?.role);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 20);

  const tabBarStyle = {
    display: 'flex' as const,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    height: 56 + bottomInset,
    paddingTop: 8,
    paddingBottom: bottomInset,
    elevation: 8,
    zIndex: 100,
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarStyle,
        tabBarHideOnKeyboard: false,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: isCommunity ? 'Mi comunidad' : 'Inicio',
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name="home"
              size={size ?? 26}
              color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="memoria"
        options={{
          title: isCommunity ? 'Mi bitácora' : 'Memoria',
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name="book-open-page-variant"
              size={size ?? 26}
              color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa Vivo Territorial',
          tabBarLabel: 'Mapa',
          tabBarStyle,
          tabBarIcon: ({ focused, size }) => (
            <MaterialCommunityIcons
              name="map-marker"
              size={size ?? 26}
              color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
            />
          ),
        }}
      />
    </Tabs>
  );
}
