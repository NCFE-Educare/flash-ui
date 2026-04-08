import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { kanbanApi, Task, TaskComment, TaskAttachment } from "../../services/api";

import DocumentPicker from "expo-document-picker";
import AssigneeSelector from "./AssigneeSelector";
import SimpleSelector from "./SimpleSelector";

interface TaskDetailModalProps {
  taskId: number;
  onClose: () => void;
}

export default function TaskDetailModal({ taskId, onClose }: TaskDetailModalProps) {
  const { colors } = useTheme();
  const { token, user } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState("");
  
  // Confirmation states
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Selector states
  const [isAssigneeSelectorVisible, setIsAssigneeSelectorVisible] = useState(false);
  const [isStatusSelectorVisible, setIsStatusSelectorVisible] = useState(false);
  const [isPrioritySelectorVisible, setIsPrioritySelectorVisible] = useState(false);

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await kanbanApi.getTask(token, taskId);
      setTask(data.task);
      setComments(data.comments);
      setAttachments(data.attachments);
      setDescription(data.task.description || "");
      
      const [memberData, workspaceData] = await Promise.all([
        kanbanApi.listMembers(token, data.task.workspace_id),
        kanbanApi.getWorkspace(token, data.task.workspace_id)
      ]);
      setMembers(memberData.members);
      setColumns(workspaceData.columns);
    } catch (err: any) {
      console.error("Failed to load task details", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = async (fields: Partial<Task>) => {
    if (!token || !task) return;
    try {
      setTask({ ...task, ...fields });
      await kanbanApi.updateTask(token, taskId, fields);
      if (fields.column_id) loadTaskDetails();
    } catch (err: any) {
      console.error("Failed to update task", err.message);
      loadTaskDetails();
    }
  };

  const handleConfirmDelete = async () => {
    if (!token) return;
    try {
      setIsDeleting(true);
      console.log(`[TASK] Hitting DELETE API for Task ID: ${taskId}`);
      
      await kanbanApi.deleteTask(token, taskId);
      
      console.log(`[TASK] Deletion successful for Task ID: ${taskId}`);
      onClose();
    } catch (err: any) {
      console.error("[TASK] Failed to delete task", err.message);
      Alert.alert("Delete Failed", err.message || "Something went wrong while deleting this task.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePickDocument = async () => {
    if (!token || !task) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploading(true);
        const res = await kanbanApi.uploadAttachment(
          token,
          taskId,
          asset.uri,
          asset.name
        );
        setAttachments((prev) => [...prev, res.attachment]);
      }
    } catch (err: any) {
      console.error("Failed to upload attachment", err.message);
      Alert.alert("Upload Failed", err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddComment = async () => {
    if (!token || !newComment.trim() || !user) return;
    try {
      const res = await kanbanApi.addComment(token, taskId, newComment);
      const fullComment = {
        ...res.comment,
        username: res.comment.username || user.username,
        email: res.comment.email || user.email
      };
      setComments((prev) => [...prev, fullComment]);
      setNewComment("");
    } catch (err: any) {
      console.error("Failed to add comment", err.message);
    }
  };

  const s = getStyles(colors);
  
  const currentColumn = columns.find(c => c.id === task?.column_id);
  const currentAssignee = members.find(m => m.user_id === task?.assignee_id);

  if (!taskId) return null;

  return (
    <Modal visible={!!taskId} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.modalContainer}>
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : task ? (
            <>
              {/* Modal Header */}
              <View style={[s.header, isDeleteConfirmVisible && s.headerDeleteActive]}>
                {isDeleteConfirmVisible ? (
                  <View style={s.deleteConfirmRow}>
                    <Text style={s.deleteConfirmText}>Delete this task permanently?</Text>
                    <View style={s.deleteActions}>
                      <TouchableOpacity 
                        style={s.cancelTextBtn} 
                        onPress={() => setIsDeleteConfirmVisible(false)}
                      >
                        <Text style={s.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={s.confirmDeleteBtn} 
                        onPress={handleConfirmDelete}
                        disabled={isDeleting}
                      >
                        <Text style={s.confirmDeleteText}>{isDeleting ? "Deleting..." : "Confirm"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={s.headerType}>
                      <Ionicons name="checkbox" size={16} color="#4b93ff" />
                      <Text style={s.headerTypeText}>TS-{task.id}</Text>
                    </View>
                    <View style={s.headerActions}>
                      <TouchableOpacity 
                        style={s.actionBtn}
                        onPress={() => setIsDeleteConfirmVisible(true)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>

              <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
                <View style={s.mainLayout}>
                  <View style={s.leftCol}>
                    <TextInput
                      style={s.titleInput}
                      value={task.title}
                      multiline
                      onChangeText={(t) => setTask({ ...task, title: t })}
                      onBlur={() => handleUpdateField({ title: task.title })}
                    />

                    <Text style={s.sectionTitle}>Description</Text>
                    {isEditingDescription ? (
                      <View>
                        <TextInput
                          style={s.descriptionInput}
                          value={description}
                          onChangeText={setDescription}
                          multiline
                          autoFocus
                        />
                        <View style={s.editActions}>
                          <TouchableOpacity 
                            style={s.saveBtn} 
                            onPress={() => handleUpdateField({ description })}
                          >
                            <Text style={s.saveBtnText}>Save</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => setIsEditingDescription(false)}
                          >
                            <Text style={s.cancelBtnText}>Cancel</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        onPress={() => setIsEditingDescription(true)}
                        style={s.descriptionPlaceholder}
                      >
                        <Text style={task.description ? s.descriptionText : s.placeholderText}>
                          {task.description || "Add a description..."}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <View style={s.section}>
                      <View style={s.sectionHeader}>
                        <Text style={s.sectionTitle}>Attachments</Text>
                        <TouchableOpacity style={s.addAttachBtn} onPress={handlePickDocument} disabled={isUploading}>
                          {isUploading ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="add" size={16} color={colors.text} />}
                          <Text style={s.addAttachText}>{isUploading ? "Uploading..." : "Add"}</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={s.attachmentList}>
                        {attachments.length > 0 ? attachments.map((at) => (
                          <View key={at.id} style={s.attachmentItem}>
                            <View style={s.attachmentIcon}>
                              <Ionicons name="document-text" size={24} color={colors.textSubtle} />
                            </View>
                            <View>
                              <Text style={s.attachmentName}>{at.file_name}</Text>
                              <Text style={s.attachmentMeta}>{new Date(at.created_at).toLocaleDateString()}</Text>
                            </View>
                          </View>
                        )) : <Text style={s.placeholderText}>No attachments yet</Text>}
                      </View>
                    </View>

                    <View style={s.section}>
                      <Text style={s.sectionTitle}>Activity</Text>
                      <View style={s.commentInputRow}>
                         <View style={[s.avatar, { backgroundColor: colors.primaryBg }]}><Text style={s.avatarText}>V</Text></View>
                         <View style={s.inputContainer}>
                           <TextInput style={s.commentInput} placeholder="Add a comment..." placeholderTextColor={colors.textSubtle} value={newComment} onChangeText={setNewComment} />
                           {newComment.length > 0 && (
                             <TouchableOpacity style={s.sendBtn} onPress={handleAddComment}>
                               <Ionicons name="send" size={16} color={colors.primary} />
                             </TouchableOpacity>
                           )}
                         </View>
                      </View>
                      <View style={s.commentList}>
                        {comments.map((c) => (
                          <View key={c.id} style={s.commentItem}>
                            <View style={[s.avatar, { backgroundColor: colors.surfaceHover }]}><Text style={s.avatarText}>{(c.username || '?').charAt(0).toUpperCase()}</Text></View>
                            <View style={s.commentBody}>
                              <View style={s.commentMeta}>
                                <Text style={s.commentUser}>{c.username}</Text>
                                <Text style={s.commentDate}>{new Date(c.created_at).toLocaleDateString()}</Text>
                              </View>
                              <Text style={s.commentText}>{c.comment}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  <View style={s.rightCol}>
                    <Text style={s.sidebarLabel}>Status</Text>
                    <TouchableOpacity style={s.statusSelect} onPress={() => setIsStatusSelectorVisible(true)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[s.columnDot, { backgroundColor: currentColumn?.color || colors.primary }]} />
                        <Text style={s.statusText}>{(currentColumn?.name || task.column_name || "...").toUpperCase()}</Text>
                      </View>
                      <Ionicons name="chevron-down" size={14} color={colors.textSubtle} />
                    </TouchableOpacity>

                    <Text style={s.sidebarLabel}>Assignee</Text>
                    <TouchableOpacity style={s.userSelect} onPress={() => setIsAssigneeSelectorVisible(true)}>
                       <View style={[s.avatarSmall, { backgroundColor: colors.primaryBg }]}><Text style={s.avatarTextSmall}>{(currentAssignee?.username || task.assignee_name || "?").charAt(0).toUpperCase()}</Text></View>
                       <Text style={s.userSelectText}>{currentAssignee?.username || task.assignee_name || "Unassigned"}</Text>
                    </TouchableOpacity>

                    <Text style={s.sidebarLabel}>Priority</Text>
                    <TouchableOpacity style={s.prioritySelect} onPress={() => setIsPrioritySelectorVisible(true)}>
                      <Ionicons name={task.priority === 'urgent' || task.priority === 'high' ? "chevron-up" : "remove"} size={16} color={task.priority === 'urgent' ? '#ef4444' : task.priority === 'high' ? '#ff9800' : '#3b82f6'} />
                      <Text style={s.prioritySelectText}>{task.priority.toUpperCase()}</Text>
                    </TouchableOpacity>

                    <View style={s.divider} />
                    <View style={s.metadataRow}><Text style={s.metaLabel}>Created</Text><Text style={s.metaValue}>{new Date(task.created_at).toLocaleDateString()}</Text></View>
                    <View style={s.metadataRow}><Text style={s.metaLabel}>Updated</Text><Text style={s.metaValue}>{new Date(task.updated_at).toLocaleDateString()}</Text></View>
                  </View>
                </View>
              </ScrollView>

              <AssigneeSelector visible={isAssigneeSelectorVisible} members={members} selectedUserId={task.assignee_id} onClose={() => setIsAssigneeSelectorVisible(false)} onSelect={(uid) => { const m = members.find(x => x.user_id === uid); handleUpdateField({ assignee_id: uid || null, assignee_name: m?.username || "Unassigned" }); }} />
              <SimpleSelector visible={isStatusSelectorVisible} title="Status" options={columns.map(c => ({ label: c.name, value: c.id }))} selectedValue={task.column_id} onClose={() => setIsStatusSelectorVisible(false)} onSelect={(cid) => handleUpdateField({ column_id: cid })} />
              <SimpleSelector visible={isPrioritySelectorVisible} title="Priority" options={[{ label: 'Urgent', value: 'urgent', icon: 'chevron-up', color: '#ef4444' }, { label: 'High', value: 'high', icon: 'chevron-up', color: '#ff9800' }, { label: 'Medium', value: 'medium', icon: 'remove', color: '#3b82f6' }, { label: 'Low', value: 'low', icon: 'chevron-down', color: '#10b981' }]} selectedValue={task.priority} onClose={() => setIsPrioritySelectorVisible(false)} onSelect={(p) => handleUpdateField({ priority: p })} />
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    modalContainer: { width: Platform.OS === 'web' ? '70%' : '95%', maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 20, overflow: "hidden" },
    center: { padding: 100, alignItems: "center" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    headerDeleteActive: { backgroundColor: '#fff5f5' },
    headerType: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTypeText: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textSubtle },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
    actionBtn: { padding: 6 },
    closeBtn: { padding: 4, marginLeft: 4 },
    deleteConfirmRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deleteConfirmText: { fontSize: 14, fontFamily: Fonts.bold, color: '#ef4444' },
    deleteActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    cancelTextBtn: { padding: 4 },
    cancelText: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textSubtle },
    confirmDeleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
    confirmDeleteText: { color: '#fff', fontSize: 13, fontFamily: Fonts.bold },
    content: { flex: 1, padding: 24 },
    mainLayout: { flexDirection: Platform.OS === 'web' ? "row" : "column", gap: 32 },
    leftCol: { flex: 2 },
    rightCol: { flex: 1, gap: 16 },
    titleInput: { fontSize: 24, fontFamily: Fonts.bold, color: colors.text, marginBottom: 24, padding: 0, ...({ outlineWidth: 0 } as any) },
    section: { marginTop: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontFamily: Fonts.bold, color: colors.text, marginBottom: 16 },
    descriptionPlaceholder: { padding: 12, borderRadius: 8, backgroundColor: colors.surfaceHover, minHeight: 80 },
    descriptionText: { fontSize: 14, fontFamily: Fonts.regular, color: colors.text, lineHeight: 22 },
    placeholderText: { fontSize: 14, fontFamily: Fonts.medium, color: colors.textSubtle },
    descriptionInput: { fontSize: 14, fontFamily: Fonts.regular, color: colors.text, backgroundColor: colors.inputBg, borderRadius: 8, padding: 12, minHeight: 120, borderWidth: 1, borderColor: colors.primary, ...({ outlineWidth: 0 } as any) },
    editActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
    saveBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
    saveBtnText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 14 },
    cancelBtnText: { color: colors.text, fontFamily: Fonts.medium, fontSize: 14 },
    attachmentList: { gap: 12 },
    attachmentItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    attachmentIcon: { width: 40, height: 40, borderRadius: 6, backgroundColor: colors.surfaceHover, alignItems: 'center', justifyContent: 'center' },
    attachmentName: { fontSize: 14, fontFamily: Fonts.medium, color: colors.text },
    attachmentMeta: { fontSize: 12, fontFamily: Fonts.regular, color: colors.textSubtle },
    commentInputRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceHover, borderRadius: 8, paddingRight: 12 },
    commentInput: { flex: 1, height: 40, paddingHorizontal: 12, fontSize: 14, color: colors.text, ...({ outlineWidth: 0 } as any) },
    commentList: { gap: 20 },
    commentItem: { flexDirection: 'row', gap: 12 },
    commentBody: { flex: 1 },
    commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    commentUser: { fontSize: 13, fontFamily: Fonts.bold, color: colors.text },
    commentDate: { fontSize: 11, fontFamily: Fonts.regular, color: colors.textSubtle },
    commentText: { fontSize: 14, fontFamily: Fonts.regular, color: colors.text, lineHeight: 20 },
    sidebarLabel: { fontSize: 12, fontFamily: Fonts.bold, color: colors.textSubtle, textTransform: 'uppercase', marginBottom: 8 },
    statusSelect: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, backgroundColor: colors.surfaceHover, borderRadius: 6, marginBottom: 20 },
    columnDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 12, fontFamily: Fonts.bold, color: colors.text },
    userSelect: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 4 },
    userSelectText: { fontSize: 14, fontFamily: Fonts.medium, color: colors.text },
    prioritySelect: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceHover, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 },
    prioritySelectText: { fontSize: 12, fontFamily: Fonts.bold, color: colors.text },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
    metadataRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    metaLabel: { fontSize: 12, fontFamily: Fonts.regular, color: colors.textSubtle },
    metaValue: { fontSize: 12, fontFamily: Fonts.medium, color: colors.text },
    avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    avatarSmall: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 14, fontFamily: Fonts.bold, color: colors.primary },
    avatarTextSmall: { fontSize: 10, fontFamily: Fonts.bold, color: colors.primary },
    addAttachBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, backgroundColor: colors.surfaceHover },
    addAttachText: { fontSize: 13, fontFamily: Fonts.medium, color: colors.text },
    sendBtn: { padding: 6 },
  });
