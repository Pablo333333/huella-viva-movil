import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, TextInput, 
  TouchableOpacity, ScrollView, ActivityIndicator, Alert 
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useCreateTramite, useAnalyzeTramiteImage } from '../../src/features/tramites/hooks/use-tramites';
import { TramiteType } from '../../src/features/tramites/services/tramites.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function NewTramiteScreen() {
  const router = useRouter();
  const [tipo, setTipo] = useState<TramiteType>(TramiteType.SOLICITUD);
  const [destinatarioId, setDestinatarioId] = useState('user-1'); // Mock
  const [estadoId, setEstadoId] = useState('state-new-id'); // Esto debería venir de un catálogo

  const createTramite = useCreateTramite({
    onSuccess: () => {
      Alert.alert('Éxito', 'Trámite creado correctamente');
      router.back();
    },
  });

  const analyzeImage = useAnalyzeTramiteImage();

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
          if (data.tipo) setTipo(data.tipo as TramiteType);
          Alert.alert('IA: Análisis Completado', `Tipo sugerido: ${data.tipo}\n\nResumen: ${data.resumen}`);
        }
      });
    }
  };

  const handleSubmit = () => {
    createTramite.mutate({
      tipo,
      destinatarioId,
      estadoId,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Nuevo Trámite' }} />
      <ScrollView style={styles.form}>
        <Text style={styles.label}>Tipo de Documento</Text>
        <View style={styles.pickerContainer}>
          {Object.values(TramiteType).map((t) => (
            <TouchableOpacity 
              key={t} 
              style={[styles.pickerItem, tipo === t && styles.pickerItemActive]}
              onPress={() => setTipo(t)}
            >
              <Text style={[styles.pickerText, tipo === t && styles.pickerTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Destinatario (ID)</Text>
        <TextInput 
          style={styles.input}
          value={destinatarioId}
          onChangeText={setDestinatarioId}
          placeholder="ID del destinatario"
        />

        <TouchableOpacity 
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={createTramite.isPending}
        >
          {createTramite.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>Crear Trámite</Text>
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
              <MaterialCommunityIcons name="sparkles" size={20} color="#3b82f6" />
              <Text style={styles.aiBtnText}>Autocompletar con IA</Text>
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
