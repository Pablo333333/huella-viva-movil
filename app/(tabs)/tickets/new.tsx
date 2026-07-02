import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, 
  TouchableOpacity, ScrollView, ActivityIndicator, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useCreateTicket, useAnalyzeTicketImage } from '@/features/tickets/hooks/use-tickets';
import { useWorkflowStates, useUsers } from '@/features/catalog/hooks/use-catalog';
import { TicketType } from '@/features/tickets/services/tickets.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function NewTicketScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType>(TicketType.SOLICITUD);
  const [destinatarioId, setDestinatarioId] = useState(''); 
  const [categoryId, setCategoryId] = useState('');
  const [workflowStateId, setWorkflowStateId] = useState('');

  const { data: states } = useWorkflowStates();
  const { data: categories } = useCategories();
  const { data: users } = useUsers();

  useEffect(() => {
    if (states && states.length > 0) {
      const newState = states.find(s => s.name.toUpperCase() === 'NUEVO');
      if (newState) setWorkflowStateId(newState.id);
    }
  }, [states]);

  useEffect(() => {
    if (categories && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    if (users && users.length > 0 && !destinatarioId) {
      setDestinatarioId(users[0].id);
    }
  }, [users]);

  const createTicket = useCreateTicket({
    onSuccess: () => {
      Alert.alert('Éxito', 'Ticket creado correctamente');
      router.back();
    },
  });

  const analyzeImage = useAnalyzeTicketImage();

  const handleAiAutofill = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita permiso para la cámara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() || 'ocr.jpg';
      
      analyzeImage.mutate({
        uri: asset.uri,
        name: fileName,
        type: 'image/jpeg',
      }, {
        onSuccess: (data) => {
          if (data.tipo) setType(data.tipo as TicketType);
          if (data.titulo) setTitle(data.titulo);
          if (data.resumen) setDescription(data.resumen);
          Alert.alert('IA: Análisis Completado', `Tipo sugerido: ${data.tipo}\n\nResumen: ${data.resumen}`);
        }
      });
    }
  };

  const handleSubmit = () => {
    if (!title) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }
    if (!categoryId) {
      Alert.alert('Error', 'La categoría es obligatoria');
      return;
    }
    createTicket.mutate({
      title,
      description,
      type,
      destinatarioId,
      categoryId,
      workflowStateId,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Nuevo Ticket' }} />
      <ScrollView style={styles.form}>
        <Text style={styles.label}>Título del Ticket</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Falla en luminaria..."
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Descripción (Voz/Texto)</Text>
        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Describe el problema..."
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.pickerContainer}>
          {Object.values(TicketType).map((t) => (
            <TouchableOpacity 
              key={t} 
              style={[styles.pickerItem, type === t && styles.pickerItemActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.pickerText, type === t && styles.pickerTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={createTicket.isPending}
        >
          {createTicket.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>Crear Ticket</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.aiBtn}
          onPress={handleAiAutofill}
          disabled={analyzeImage.isPending}
        >
          {analyzeImage.isPending ? (
            <ActivityIndicator color="#3b82f6" />
          ) : (
            <>
              <MaterialCommunityIcons name="camera" size={20} color="#3b82f6" />
              <Text style={styles.aiBtnText}>Escanear con IA (OCR)</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  form: { padding: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8, marginTop: 16 },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem: { 
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, 
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' 
  },
  pickerItemActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  pickerText: { fontSize: 12, color: '#6b7280' },
  pickerTextActive: { color: 'white', fontWeight: 'bold' },
  input: { 
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, 
    padding: 12, fontSize: 16, backgroundColor: '#f9fafb' 
  },
  submitBtn: { 
    backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, 
    alignItems: 'center', marginTop: 32 
  },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  aiBtn: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6',
    marginTop: 12, gap: 8
  },
  aiBtnText: { color: '#3b82f6', fontWeight: 'bold' }
});
