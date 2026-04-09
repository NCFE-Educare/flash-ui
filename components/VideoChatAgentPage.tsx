import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Fonts } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { videoAgentApi, Circular, LiveKitTokenResponse } from '../services/videoAgentApi';
import LiveKitRoomView from './LiveKitRoomView';

export default function VideoChatAgentPage() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // ── Connection State ──
  const [showVideoRoom, setShowVideoRoom] = useState(false);
  const [joinResult, setJoinResult] = useState<LiveKitTokenResponse | null>(null);

  // ── Join Room State ──
  const [participantName, setParticipantName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // ── Upload State ──
  const [docTitle, setDocTitle] = useState('');
  const [circularId, setCircularId] = useState('');
  const [category, setCategory] = useState('Academic Policy');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<any>(null);

  // ── List State ──
  const [recentCirculars, setRecentCirculars] = useState<Circular[]>([]);
  const [isLoadingCirculars, setIsLoadingCirculars] = useState(false);

  useEffect(() => {
    loadRecentCirculars();
  }, []);

  const loadRecentCirculars = async () => {
    try {
      setIsLoadingCirculars(true);
      const data = await videoAgentApi.listCirculars(10);
      setRecentCirculars(data);
    } catch (err: any) {
      console.error('Failed to load circulars:', err.message);
    } finally {
      setIsLoadingCirculars(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!participantName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      setIsJoining(true);
      setJoinResult(null);
      const result = await videoAgentApi.getLiveKitToken(participantName);
      setJoinResult(result);
      setShowVideoRoom(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to connect: ' + err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = () => {
    setShowVideoRoom(false);
    setJoinResult(null);
  };

  const handleFileSelect = (e: any) => {
    if (Platform.OS === 'web') {
      const files = Array.from(e.target.files || []) as File[];
      setSelectedFiles(files);
    }
  };

  const handleUpload = async () => {
    if (!docTitle || !circularId || selectedFiles.length === 0) {
      Alert.alert('Error', 'Please fill all required fields and select files');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('title', docTitle);
      formData.append('circular_id', circularId);
      formData.append('category', category.toLowerCase());
      formData.append('date', date);
      
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      await videoAgentApi.uploadCircular(formData);
      Alert.alert('Success', 'Circular uploaded successfully');
      
      // Reset form
      setDocTitle('');
      setCircularId('');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      loadRecentCirculars();
    } catch (err: any) {
      Alert.alert('Error', 'Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Render Video Room View ──
  if (showVideoRoom && joinResult) {
    return (
      <LiveKitRoomView 
        token={joinResult.token} 
        url={joinResult.url} 
        onLeave={handleLeaveRoom} 
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Video Chat Agent Section */}
      <View style={styles.resourceSection}>
        {!isMobile && (
          <>
            <Text style={[styles.sectionMainTitle, { color: colors.text }]}>Video Chat Agent</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSubtle }]}>
              Real-time AI video conferencing and intelligent resource orchestration. Connect, collaborate, and manage documents seamlessly within your digital workspace.
            </Text>
          </>
        )}

        <View style={[styles.resourceGrid, { flexDirection: isMobile ? 'column' : 'row' }]}>
          {/* Join Room Card */}
          <View style={[styles.resourceCard, styles.joinRoomCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
                <Ionicons name="log-in-outline" size={20} color="#eab308" />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Join Room</Text>
                <Text style={[styles.cardTag, { color: colors.textMuted }]}>ACTIVE SESSION ACCESS</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSubtle }]}>YOUR NAME</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
                value={participantName}
                onChangeText={setParticipantName}
              />
            </View>

            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={handleJoinRoom}
              disabled={isJoining}
            >
              <LinearGradient
                colors={['#6366f1', '#4f46e5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, isJoining && { opacity: 0.7 }]}
              >
                {isJoining ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Connect to Room</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={[styles.infoNote, { backgroundColor: 'rgba(234, 179, 8, 0.05)' }]}>
              <Ionicons name="information-circle" size={16} color="#eab308" />
              <Text style={[styles.infoNoteText, { color: colors.textSubtle }]}>
                Connecting to a room allows you to participate in real-time document annotation and scholarly discussions.
              </Text>
            </View>
          </View>

          {/* Upload Card */}
          <View style={[styles.resourceCard, styles.uploadCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Upload Circular PDFs</Text>
                <Text style={[styles.cardTag, { color: colors.textMuted }]}>ARCHIVE MANAGEMENT</Text>
              </View>
              <View style={styles.newEntryBadge}>
                <Text style={styles.newEntryText}>NEW ENTRY</Text>
              </View>
            </View>

            <View style={[styles.formRow, { flexDirection: isMobile ? 'column' : 'row' }]}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSubtle }]}>DOCUMENT TITLE</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. Annual Curriculum 20..."
                  placeholderTextColor={colors.textMuted}
                  value={docTitle}
                  onChangeText={setDocTitle}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSubtle }]}>CIRCULAR ID</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="REF-CBSE-2024-001"
                  placeholderTextColor={colors.textMuted}
                  value={circularId}
                  onChangeText={setCircularId}
                />
              </View>
            </View>

            <View style={[styles.formRow, { flexDirection: isMobile ? 'column' : 'row' }]}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSubtle }]}>CATEGORY</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="Academic Policy"
                  placeholderTextColor={colors.textMuted}
                  value={category}
                  onChangeText={setCategory}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSubtle }]}>PUBLICATION DATE</Text>
                <TextInput 
                  style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={date}
                  onChangeText={setDate}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSubtle, marginTop: 12 }]}>PDF DOCUMENTATION</Text>
            
            {Platform.OS === 'web' && (
              <input 
                type="file" 
                multiple 
                accept="application/pdf" 
                style={{ display: 'none' }} 
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            )}

            <TouchableOpacity 
              style={[styles.dropZone, { borderColor: colors.border }]}
              onPress={() => fileInputRef.current?.click()}
            >
              <View style={[styles.dropZoneIcon, { backgroundColor: colors.surfaceHover }]}>
                <Ionicons name="cloud-upload" size={24} color={colors.textSubtle} />
              </View>
              <Text style={[styles.dropZoneTitle, { color: colors.text }]}>
                {selectedFiles.length > 0 
                  ? `${selectedFiles.length} file(s) selected` 
                  : 'Choose PDF files or drag and drop'}
              </Text>
              {selectedFiles.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  {selectedFiles.map((f, i) => (
                    <Text key={i} style={{ color: colors.textMuted, fontSize: 10 }}>• {f.name}</Text>
                  ))}
                </View>
              )}
              <Text style={[styles.dropZoneSubtitle, { color: colors.textMuted }]}>Maximum file size 20MB per document</Text>
            </TouchableOpacity>

            <View style={styles.footerActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedFiles([])}>
                <Text style={[styles.cancelBtnText, { color: colors.textSubtle }]}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={handleUpload} disabled={isUploading}>
                <LinearGradient
                  colors={['#6366f1', '#4f46e5']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.uploadBtn, isUploading && { opacity: 0.7 }]}
                >
                  {isUploading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                      <Text style={styles.uploadBtnText}>Upload Document</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recent Circulars List */}
        <View style={{ marginTop: 48, paddingBottom: 100 }}>
           <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 16 }]}>Recent Circulars</Text>
           {isLoadingCirculars ? (
             <ActivityIndicator color={colors.primary} />
           ) : (
             <View style={{ gap: 12 }}>
                {recentCirculars.map((item) => (
                  <View key={item.id} style={[styles.resourceCard, { padding: 16, backgroundColor: colors.surfaceSecondary, borderStyle: 'solid', flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
                    <View style={[styles.cardIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                      <Ionicons name="document-text" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { fontSize: 15, color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
                        ID: {item.circular_id} • {new Date(item.date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.newEntryBadge, { backgroundColor: item.processed ? '#22c55e' : '#f97316' }]}>
                      <Text style={styles.newEntryText}>{item.processed ? 'PROCESSED' : 'PROCESSING'}</Text>
                    </View>
                  </View>
                ))}
                {recentCirculars.length === 0 && (
                  <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 20 }}>No circulars found.</Text>
                )}
             </View>
           )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 2,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  newBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  actionBtn: {
    padding: 2,
  },
  // Resource Section Styles
  resourceSection: {
    paddingBottom: 40,
  },
  sectionMainTitle: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginTop: 8,
    maxWidth: 600,
    lineHeight: 20,
  },
  resourceGrid: {
    gap: 24,
    marginTop: 32,
  },
  resourceCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  joinRoomCard: {
    minWidth: 320,
    flex: 1,
  },
  uploadCard: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  cardTag: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 1,
    marginTop: 2,
  },
  newEntryBadge: {
    backgroundColor: '#f97316',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newEntryText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: Fonts.bold,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  pickerPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  infoNote: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginTop: 24,
    gap: 10,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },
  dropZone: {
    marginTop: 8,
    height: 160,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  dropZoneIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dropZoneTitle: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  dropZoneSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    marginTop: 4,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
  uploadBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.bold,
  },
});
