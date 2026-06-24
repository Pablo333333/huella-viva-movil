import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { KanbanBoard } from '../../src/components/KanbanBoard';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function KanbanScreen() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Tablero Kanban' }} />
        <KanbanBoard />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' }
});
