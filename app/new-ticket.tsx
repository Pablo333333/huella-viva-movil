import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, 
  TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useCreateTicket, useAnalyzeTicketImage } from '@/features/tickets/hooks/use-tickets';
import { useWorkflowStates, useUsers, useCategories } from '@/features/catalog/hooks/use-catalog';
import { TicketType } from '@/features/tickets/services/tickets.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, AudioModule } from 'expo-audio';

export default function NewTicketScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<TicketType>(TicketType.SOLICITUD);
  const [destinatarioId, setDestinatarioId] = useState(''); 
  const [categoryId, setCategoryId] = useState('');
  const [workflowStateId, setWorkflowStateId] = useState('');
  const [audioFile, setAudioFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isProcessing = useRef(false);

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

  const startRecording = async () => {
    if (isProcessing.current || recorderState.isRecording) return;
    isProcessing.current = true;

    try {
      // 1. Verificación bloqueante de permisos
      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso para el micrófono para grabar audio.');
        isProcessing.current = false;
        return;
      }

      // 2. Configuración de modo de audio
      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // 3. Preparación y grabación
      // useAudioRecorderState nos dice si ya está preparado o grabando
      if (!recorderState.isRecording) {
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
      }
    } catch (err: any) {
      console.error('Failed to start recording', err);
      // Si el error es que ya está preparado, intentamos grabar directamente
      if (err.message?.includes('already been prepared')) {
        try {
          audioRecorder.record();
        } catch (retryErr) {
          console.error('Retry record failed', retryErr);
        }
      } else {
        Alert.alert('Error', 'No se pudo iniciar la grabación. Por favor, intenta de nuevo.');
      }
    } finally {
      isProcessing.current = false;
    }
  };

  const stopRecording = async () => {
    if (isProcessing.current || !recorderState.isRecording) return;
    isProcessing.current = true;

    try {
      await audioRecorder.stop();
      // Pequeña espera para asegurar que el archivo se libere
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const uri = audioRecorder.uri;
      if (uri) {
        console.log('[UI] Audio grabado en:', uri);
        // Normalización de URI para Android
        const finalUri = Platform.OS === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://') 
          ? `file://${uri}` 
          : uri;

        const fileName = `recording-${Date.now()}.m4a`;
        setAudioFile({
          uri: finalUri,
          name: fileName,
          type: 'audio/m4a',
        });
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    } finally {
      isProcessing.current = false;
    }
  };

  const handleSubmit = () => {
    if (!title) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }
    if (!categoryId) {
      Alert.alert('Error', 'La categoría es obligatoria. Por favor, espera a que se carguen los datos.');
      return;
    }
    if (!workflowStateId) {
      Alert.alert('Error', 'El estado inicial es obligatorio. Por favor, espera a que se carguen los datos.');
      return;
    }

    console.log('[UI] Enviando ticket:', { title, categoryId, workflowStateId, hasAudio: !!audioFile });

    // El backend rechaza 'type', 'destinatarioId' y 'statusId'
    // Requiere obligatoriamente 'categoryId' y 'workflowStateId'
    createTicket.mutate({
      title,
      description,
      categoryId,
      workflowStateId,
      audioFile: audioFile || undefined,
    });
  };

  const formatDuration = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Nuevo Ticket', presentation: 'modal' }} />
      <ScrollView style={styles.form}>
        <Text style={styles.label}>Título del Ticket</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Falla en luminaria..."
          value={title}
          onChangeText={setTitle}
        />

        <View style={styles.labelRow}>
          <Text style={styles.label}>Descripción (Voz/Texto)</Text>
          <TouchableOpacity 
            style={[
              styles.micBtn, 
              recorderState.isRecording && styles.micBtnActive,
              audioFile && !recorderState.isRecording && styles.micBtnHasAudio
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <MaterialCommunityIcons 
              name={recorderState.isRecording ? "stop" : "microphone"} 
              size={20} 
              color={recorderState.isRecording || audioFile ? "white" : "#3b82f6"} 
            />
          </TouchableOpacity>
        </View>

        {recorderState.isRecording && (
          <View style={styles.recordingIndicator}>
            <MaterialCommunityIcons name="record" size={16} color="#ef4444" />
            <Text style={styles.recordingText}>Grabando: {formatDuration(recorderState.durationMillis)}</Text>
          </View>
        )}

        {audioFile && !recorderState.isRecording && (
          <View style={styles.audioAttached}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#10b981" />
            <Text style={styles.audioAttachedText}>Audio grabado: {audioFile.name}</Text>
            <TouchableOpacity onPress={() => setAudioFile(null)}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

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
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  micBtn: { 
    width: 36, height: 36, borderRadius: 18, 
    borderWidth: 1, borderColor: '#3b82f6', 
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'white'
  },
  micBtnActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  micBtnHasAudio: { backgroundColor: '#10b981', borderColor: '#10b981' },
  recordingIndicator: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    marginBottom: 8, backgroundColor: '#fee2e2', padding: 8, borderRadius: 8 
  },
  recordingText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  audioAttached: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    marginBottom: 8, backgroundColor: '#ecfdf5', padding: 8, borderRadius: 8 
  },
  audioAttachedText: { color: '#10b981', fontSize: 12, fontWeight: 'medium', flex: 1 },
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
