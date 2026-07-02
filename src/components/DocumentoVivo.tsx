import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Platform 
} from 'react-native';
import { 
  useTicketComments, useCreateTicketComment, useTicketDocuments, 
  useUploadTicketDocument, useSummarizeTicket, useTicketSummary, useTicketHistory 
} from '../features/tickets/hooks/use-tickets';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

interface DocumentoVivoProps {
  entityId: string;
  entityType: 'TICKET';
}

type TabType = 'chat' | 'docs' | 'history';

// URL de la API (ajustar según entorno)
const API_URL = Platform.OS === 'android' ? 'http://192.168.0.113:4000' : 'http://localhost:4000';

export const DocumentoVivo: React.FC<DocumentoVivoProps> = ({ entityId, entityType }) => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket: Socket = io(API_URL);

    socket.on('connect', () => {
      console.log('Connected to socket (Mobile)');
      socket.emit('joinRoom', { roomId: entityId });
    });

    socket.on('messageReceived', (comment) => {
      console.log('New message received via socket (Mobile):', comment);
      queryClient.invalidateQueries({ queryKey: ['tickets', entityId, 'comments'] });
    });

    socket.on('statusChanged', (data) => {
      console.log('Status changed via socket (Mobile):', data);
      queryClient.invalidateQueries({ queryKey: ['tickets', entityId] });
      queryClient.invalidateQueries({ queryKey: ['tickets', entityId, 'history'] });
    });

    return () => {
      socket.emit('leaveRoom', { roomId: entityId });
      socket.disconnect();
    };
  }, [entityId, queryClient]);

  const commentsQuery = useTicketComments(entityId);
  const createCommentMutation = useCreateTicketComment(entityId);
  
  const documentsQuery = useTicketDocuments(entityId);
  const uploadDocumentMutation = useUploadTicketDocument(entityId);
  
  const summarizeMutation = useSummarizeTicket(entityId);
  const summaryQuery = useTicketSummary(entityId);
  const historyQuery = useTicketHistory(entityId);

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment, {
      onSuccess: () => setNewComment(''),
    });
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        uploadDocumentMutation.mutate({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        });
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo seleccionar el documento');
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso para acceder a la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.uri.split('/').pop() || 'photo.jpg';
        uploadDocumentMutation.mutate({
          uri: asset.uri,
          name: fileName,
          type: 'image/jpeg',
        });
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  return (
    <View style={styles.container}>
      {/* Resumen IA */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="creation" size={20} color="#3b82f6" />
            <Text style={styles.summaryTitle}>Resumen Inteligente</Text>
          </View>
          <TouchableOpacity 
            onPress={() => summarizeMutation.mutate()}
            disabled={summarizeMutation.isPending}
          >
            {summarizeMutation.isPending ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={20} color="#3b82f6" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.summaryText}>
          {summaryQuery.data || "Solicita un resumen para analizar este documento vivo."}
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'chat' && styles.activeTab]} 
          onPress={() => setActiveTab('chat')}
        >
          <MaterialCommunityIcons name="message-text" size={20} color={activeTab === 'chat' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'docs' && styles.activeTab]} 
          onPress={() => setActiveTab('docs')}
        >
          <MaterialCommunityIcons name="file-document" size={20} color={activeTab === 'docs' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'docs' && styles.activeTabText]}>Docs</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
          onPress={() => setActiveTab('history')}
        >
          <MaterialCommunityIcons name="history" size={20} color={activeTab === 'history' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Historial</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'chat' && (
          <View style={styles.chatContainer}>
            {commentsQuery.isLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
            ) : (
              commentsQuery.data?.map((comment: any) => (
                <View key={comment.id} style={styles.commentBubble}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{comment.user?.name || 'Usuario'}</Text>
                    <Text style={styles.commentDate}>{new Date(comment.createdAt).toLocaleTimeString()}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'docs' && (
          <View style={styles.docsContainer}>
            {documentsQuery.isLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : (
              documentsQuery.data?.map((doc: any) => (
                <View key={doc.id} style={styles.docItem}>
                  <MaterialCommunityIcons name="file-pdf-box" size={32} color="#ef4444" />
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                    <Text style={styles.docDate}>{new Date(doc.createdAt).toLocaleDateString()}</Text>
                    {doc.extractedText && (
                      <View style={styles.ocrBadge}>
                        <Text style={styles.ocrBadgeText}>OCR</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.docActions}>
                    <TouchableOpacity style={styles.viewBtn}>
                      <Text style={styles.viewBtnText}>Ver</Text>
                    </TouchableOpacity>
                    {doc.extractedText && (
                      <TouchableOpacity 
                        style={styles.ocrBtn}
                        onPress={() => Alert.alert('Texto Extraído (OCR)', doc.extractedText)}
                      >
                        <MaterialCommunityIcons name="eye-outline" size={20} color="#3b82f6" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            {historyQuery.isLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : (
              historyQuery.data?.map((entry: any) => (
                <View key={entry.id} style={styles.historyItem}>
                  <View style={styles.historyDot} />
                  <View style={styles.historyLine} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyTitle}>
                      {entry.oldStateName || 'Inicio'} → {entry.newStateName}
                    </Text>
                    <Text style={styles.historyMeta}>
                      Por {entry.userName} • {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Input de Chat (solo visible en tab chat) */}
      {activeTab === 'chat' && (
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input}
            placeholder="Escribe un mensaje..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <View style={styles.inputActions}>
            <TouchableOpacity onPress={handlePickImage} style={styles.actionBtn}>
              <MaterialCommunityIcons name="camera" size={24} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickDocument} style={styles.actionBtn}>
              <MaterialCommunityIcons name="paperclip" size={24} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSendComment} 
              style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
              disabled={!newComment.trim() || createCommentMutation.isPending}
            >
              <MaterialCommunityIcons name="send" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  summaryCard: { 
    margin: 16, padding: 16, backgroundColor: '#eff6ff', 
    borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe' 
  },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  summaryTitle: { marginLeft: 8, fontWeight: 'bold', color: '#1e40af' },
  summaryText: { fontSize: 13, color: '#1e40af', fontStyle: 'italic' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: 'white' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { marginLeft: 6, fontSize: 13, color: '#6b7280', fontWeight: '500' },
  activeTabText: { color: '#3b82f6' },
  content: { flex: 1, backgroundColor: '#f0f2f5' },
  chatContainer: { padding: 10 },
  commentBubble: { 
    backgroundColor: 'white', 
    padding: 10, 
    borderRadius: 15, 
    marginBottom: 8, 
    maxWidth: '85%',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  commentUser: { fontSize: 11, fontWeight: 'bold', color: '#2563eb' },
  commentDate: { fontSize: 9, color: '#9ca3af', marginLeft: 8 },
  commentText: { fontSize: 15, color: '#1f2937' },
  docsContainer: { padding: 16 },
  docItem: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', 
    padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' 
  },
  docInfo: { flex: 1, marginLeft: 12 },
  docName: { fontSize: 14, fontWeight: '500' },
  docDate: { fontSize: 12, color: '#6b7280' },
  ocrBadge: { 
    backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, 
    borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 
  },
  ocrBadgeText: { fontSize: 8, color: '#166534', fontWeight: 'bold' },
  docActions: { alignItems: 'center' },
  ocrBtn: { marginTop: 8 },
  viewBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  viewBtnText: { color: '#3b82f6', fontWeight: 'bold' },
  historyContainer: { padding: 16 },
  historyItem: { flexDirection: 'row', paddingBottom: 20 },
  historyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6', zIndex: 1 },
  historyLine: { position: 'absolute', left: 5, top: 12, bottom: 0, width: 2, backgroundColor: '#e5e7eb' },
  historyContent: { marginLeft: 16, flex: 1 },
  historyTitle: { fontSize: 14, fontWeight: 'bold' },
  historyMeta: { fontSize: 12, color: '#6b7280' },
  inputContainer: { 
    padding: 12, backgroundColor: 'white', borderTopWidth: 1, 
    borderTopColor: '#e5e7eb', flexDirection: 'row', alignItems: 'flex-end' 
  },
  input: { 
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, 
    paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, fontSize: 14 
  },
  inputActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  actionBtn: { padding: 8 },
  sendBtn: { 
    backgroundColor: '#3b82f6', width: 40, height: 40, 
    borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 4 
  },
  sendBtnDisabled: { backgroundColor: '#9ca3af' }
});
