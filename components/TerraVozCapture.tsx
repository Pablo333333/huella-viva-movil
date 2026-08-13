import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { useTerraVoz, getTerraVozErrorMessage } from '@/features/terra-voz/hooks/use-terra-voz';
import {
  TerraVozPreviewResponse,
  TerraVozResponse,
} from '@/features/terra-voz/services/terra-voz.service';
import { getCurrentDeviceCoords, DeviceCoords } from '@/lib/location';
import { ActivityStatus, ActivityType } from '@/features/activities/types';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

type CaptureMode = 'voice' | 'text';

interface Props {
  communityId?: string;
  onSuccess?: (result: TerraVozResponse) => void;
  onCancel?: () => void;
}

const DEMO_PROMPTS = [
  'Hoy visité Medellín para revisar el acueducto',
  'Reunión mañana en Buenos Aires con la comunidad',
  'Compromiso: entregar tubería el viernes en San José del Guaviare',
];

function locationSourceLabel(source?: string | null): string {
  switch (source) {
    case 'name':
      return 'Extraído del mensaje';
    case 'gps':
      return 'Ubicación GPS';
    case 'transcript':
      return 'Texto transcrito';
    default:
      return '';
  }
}

const ACTIVITY_TYPES: ActivityType[] = ['REUNION', 'VISITA', 'INSPECCION', 'TALLER', 'OTRO'];

export const TerraVozCapture: React.FC<Props> = ({
  communityId,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const terraVoz = useTerraVoz();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [mode, setMode] = useState<CaptureMode>('text');
  const [textInput, setTextInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<TerraVozPreviewResponse | null>(null);
  const [result, setResult] = useState<TerraVozResponse | null>(null);
  const [coords, setCoords] = useState<DeviceCoords | null>(null);
  const [editedUbicacion, setEditedUbicacion] = useState('');
  const [editedDescripcion, setEditedDescripcion] = useState('');
  const [editedTipo, setEditedTipo] = useState<ActivityType>('OTRO');
  const [editedEstado, setEditedEstado] = useState<ActivityStatus>('EJECUTADA');

  const pulseAnim = useSharedValue(0);

  const animatedPulse = useAnimatedStyle(() => {
    const scale = interpolate(pulseAnim.value, [0, 1], [1, 1.5]);
    const opacity = interpolate(pulseAnim.value, [0, 1], [0.8, 0]);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  useEffect(() => {
    if (recorderState.isRecording) {
      pulseAnim.value = withRepeat(withTiming(1, { duration: 1000 }), -1, false);
    } else {
      pulseAnim.value = 0;
    }
  }, [recorderState.isRecording, pulseAnim]);

  useEffect(() => {
    let cancelled = false;
    getCurrentDeviceCoords().then((value) => {
      if (!cancelled) setCoords(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function resetRecorderSession() {
    const status = audioRecorder.getStatus();
    if (!status.canRecord && !status.isRecording) {
      return;
    }

    try {
      await audioRecorder.stop();
    } catch (err) {
      console.warn('TerraVoz: no se pudo detener la sesión previa del grabador', err);
    }
  }

  async function startRecording() {
    try {
      setErrorMessage(null);
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Necesitamos acceso al micrófono para grabar.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await resetRecorderSession();
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      getCurrentDeviceCoords().then(setCoords);
    } catch (err) {
      console.error('Error al iniciar grabación', err);
      setErrorMessage('No se pudo iniciar la grabación. Usa el modo texto.');
      setMode('text');
    }
  }

  async function stopRecording() {
    if (!recorderState.isRecording) return;

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) {
        setErrorMessage('No se obtuvo el audio. Intenta de nuevo o usa texto.');
        return;
      }
      await handlePreview({ audioUri: uri });
    } catch (err) {
      console.error('Error al detener grabación', err);
      setErrorMessage('Error al finalizar la grabación.');
    }
  }

  async function handlePreview(payload: { text?: string; audioUri?: string }) {
    if (!user?.id) {
      setErrorMessage('Debes iniciar sesión para registrar con Terra Voz.');
      return;
    }

    try {
      setErrorMessage(null);
      const gps = coords || (await getCurrentDeviceCoords());
      if (gps) setCoords(gps);

      const response = await terraVoz.preview.mutateAsync({
        ...payload,
        communityId: communityId || user.communityId || undefined,
        gpsPlaceName: gps?.placeName || undefined,
        userId: user.id,
        latitude: gps?.latitude,
        longitude: gps?.longitude,
      });

      setPreview(response);
      setEditedDescripcion(response.parsed.descripcion);
      setEditedTipo(response.parsed.tipo);
      setEditedEstado(response.parsed.estado);
      setEditedUbicacion(
        response.ubicacionTexto ||
          response.parsed.comunidadNombre ||
          gps?.placeName ||
          '',
      );
    } catch (err: any) {
      console.error('Error procesando Terra Voz', err);
      setErrorMessage(err?.friendlyMessage || getTerraVozErrorMessage(err));
    }
  }

  async function handleConfirm() {
    if (!user?.id || !preview) return;

    if (editedUbicacion.trim().length < 2) {
      setErrorMessage('Indica la comunidad o ubicación extraída del mensaje.');
      return;
    }

    if (editedDescripcion.trim().length < 12) {
      setErrorMessage('Completa una descripción clara antes de enviar.');
      return;
    }

    try {
      setErrorMessage(null);
      const response = await terraVoz.confirm.mutateAsync({
        transcript: preview.transcript,
        tipo: editedTipo,
        descripcion: editedDescripcion.trim(),
        fecha: preview.parsed.fecha,
        estado: editedEstado,
        comunidadNombre: editedUbicacion.trim(),
        userId: user.id,
        latitude: preview.latitude ?? coords?.latitude,
        longitude: preview.longitude ?? coords?.longitude,
        commitments: preview.parsed.commitments,
      });
      setResult(response);
    } catch (err: any) {
      console.error('Error confirmando Terra Voz', err);
      setErrorMessage(err?.friendlyMessage || getTerraVozErrorMessage(err));
    }
  }

  function submitText() {
    const trimmed = textInput.trim();
    if (!trimmed) {
      setErrorMessage('Escribe o pega una frase para simular Terra Voz.');
      return;
    }
    handlePreview({ text: trimmed });
  }

  const isBusy = terraVoz.preview.isPending || terraVoz.confirm.isPending;

  if (isBusy && !preview) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Preparando vista previa...</Text>
        <Text style={styles.subLoadingText}>
          Transcripción y extracción de lugar. Aún no se guarda nada.
        </Text>
      </View>
    );
  }

  if (result) {
    return (
      <View style={styles.card}>
        <View style={styles.successIcon}>
          <MaterialCommunityIcons name="check-circle" size={56} color="#10b981" />
        </View>
        <Text style={styles.successTitle}>¡Registrado con éxito!</Text>
        <Text style={styles.successMessage}>{result.message}</Text>

        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Tipo</Text>
          <Text style={styles.resultValue}>{result.activity.tipo}</Text>
          <Text style={styles.resultLabel}>Estado</Text>
          <Text style={styles.resultValue}>{result.activity.estado || editedEstado}</Text>
          <Text style={styles.resultLabel}>Comunidad</Text>
          <Text style={styles.resultValue}>
            {result.communityName || 'Territorio'}
          </Text>
          <Text style={styles.resultLabel}>Descripción</Text>
          <Text style={styles.resultValue}>{result.activity.descripcion}</Text>
          {result.commitmentsCreated > 0 && (
            <>
              <Text style={styles.resultLabel}>Compromisos</Text>
              <Text style={styles.resultValue}>
                {result.commitmentsCreated} creado(s)
              </Text>
            </>
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => onSuccess?.(result)}
        >
          <Text style={styles.primaryButtonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (preview) {
    const canSend =
      editedUbicacion.trim().length >= 2 && editedDescripcion.trim().length >= 12;
    const sourceLabel = locationSourceLabel(preview.communitySource);

    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.card} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>¿Enviar mensaje?</Text>
          <Text style={styles.subtitle}>
            Revisa la vista previa. Solo se guardará si confirmas un mensaje completo.
          </Text>

          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Transcripción</Text>
            <Text style={styles.resultValue}>{preview.transcript}</Text>
          </View>

          {preview.validation.issues.length > 0 && (
            <View style={styles.warningBox}>
              {preview.validation.issues.map((issue) => (
                <Text key={issue} style={styles.warningText}>
                  • {issue}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.fieldLabel}>Tipo</Text>
          <View style={styles.promptsRow}>
            {ACTIVITY_TYPES.map((tipo) => (
              <TouchableOpacity
                key={tipo}
                style={[styles.promptChip, editedTipo === tipo && styles.promptChipActive]}
                onPress={() => setEditedTipo(tipo)}
              >
                <Text
                  style={[
                    styles.promptChipText,
                    editedTipo === tipo && styles.promptChipTextActive,
                  ]}
                >
                  {tipo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Estado</Text>
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[styles.modeChip, editedEstado === 'EJECUTADA' && styles.modeChipActive]}
              onPress={() => setEditedEstado('EJECUTADA')}
            >
              <Text
                style={[
                  styles.modeChipText,
                  editedEstado === 'EJECUTADA' && styles.modeChipTextActive,
                ]}
              >
                Ejecutada
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeChip, editedEstado === 'PROGRAMADA' && styles.modeChipActive]}
              onPress={() => setEditedEstado('PROGRAMADA')}
            >
              <Text
                style={[
                  styles.modeChipText,
                  editedEstado === 'PROGRAMADA' && styles.modeChipTextActive,
                ]}
              >
                Programada
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>
            Comunidad / ubicación{sourceLabel ? ` · ${sourceLabel}` : ''}
          </Text>
          <TextInput
            style={styles.locationInput}
            placeholder="Ciudad, comunidad o lugar extraído del mensaje"
            placeholderTextColor="#94a3b8"
            value={editedUbicacion}
            onChangeText={setEditedUbicacion}
          />

          <Text style={styles.fieldLabel}>Descripción</Text>
          <TextInput
            style={styles.textInput}
            multiline
            value={editedDescripcion}
            onChangeText={setEditedDescripcion}
            textAlignVertical="top"
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, (!canSend || terraVoz.confirm.isPending) && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={!canSend || terraVoz.confirm.isPending}
          >
            {terraVoz.confirm.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Enviar mensaje
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setPreview(null);
              setErrorMessage(null);
            }}
          >
            <Text style={styles.cancelText}>Volver a editar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.card}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Terra Voz</Text>
        <Text style={styles.subtitle}>
          Dicta o escribe la actividad. Verás una vista previa antes de guardar.
        </Text>

        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeChip, mode === 'voice' && styles.modeChipActive]}
            onPress={() => setMode('voice')}
          >
            <MaterialCommunityIcons
              name="microphone"
              size={16}
              color={mode === 'voice' ? '#fff' : '#64748b'}
            />
            <Text
              style={[
                styles.modeChipText,
                mode === 'voice' && styles.modeChipTextActive,
              ]}
            >
              Voz
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, mode === 'text' && styles.modeChipActive]}
            onPress={() => setMode('text')}
          >
            <MaterialCommunityIcons
              name="keyboard"
              size={16}
              color={mode === 'text' ? '#fff' : '#64748b'}
            />
            <Text
              style={[
                styles.modeChipText,
                mode === 'text' && styles.modeChipTextActive,
              ]}
            >
              Texto (demo)
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'voice' ? (
          <>
            <View style={styles.recordContainer}>
              {recorderState.isRecording && (
                <Animated.View style={[styles.pulseCircle, animatedPulse]} />
              )}
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  recorderState.isRecording && styles.recordingActive,
                ]}
                onPressIn={startRecording}
                onPressOut={stopRecording}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={
                    recorderState.isRecording
                      ? 'microphone'
                      : 'microphone-outline'
                  }
                  size={40}
                  color="white"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {recorderState.isRecording
                ? 'Suelta para previsualizar'
                : 'Mantén presionado para hablar'}
            </Text>
          </>
        ) : (
          <>
            <TextInput
              style={styles.textInput}
              multiline
              placeholder='Ej: "Hoy visité El Roble" o "Jueves 25 a las 10 am reunión..."'
              placeholderTextColor="#94a3b8"
              value={textInput}
              onChangeText={setTextInput}
              textAlignVertical="top"
            />
            <View style={styles.promptsRow}>
              {DEMO_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={styles.promptChip}
                  onPress={() => setTextInput(prompt)}
                >
                  <Text style={styles.promptChipText} numberOfLines={2}>
                    {prompt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={submitText}>
              <MaterialCommunityIcons
                name="eye-outline"
                size={18}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.primaryButtonText}>Previsualizar</Text>
            </TouchableOpacity>
          </>
        )}

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modeSwitch: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  modeChipActive: {
    backgroundColor: '#2563eb',
  },
  modeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  modeChipTextActive: {
    color: '#fff',
  },
  recordContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 2,
  },
  recordingActive: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  pulseCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
    position: 'absolute',
    zIndex: 1,
  },
  hint: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2563eb',
    marginBottom: 16,
  },
  textInput: {
    width: '100%',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  locationInput: {
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  promptsRow: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  promptChip: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  promptChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  promptChipText: {
    fontSize: 12,
    color: '#1d4ed8',
  },
  promptChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    width: '100%',
    marginBottom: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    padding: 12,
  },
  cancelText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#065f46',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  resultBox: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  resultLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  resultValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    marginTop: 2,
  },
  warningBox: {
    width: '100%',
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  warningText: {
    color: '#c2410c',
    fontSize: 13,
    marginBottom: 4,
  },
  fieldLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
});
