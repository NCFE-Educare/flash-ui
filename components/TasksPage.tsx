import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  useWindowDimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { kanbanApi, Workspace, DashboardSummary } from "../services/api";
import KanbanBoard from "./kanban/KanbanBoard";

export default function TasksPage() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  
  const isMobile = width < 1024;
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isRenamingWorkspace, setIsRenamingWorkspace] = useState<number | null>(null);
  const [newWsName, setNewWsName] = useState("");
  
  // Mobile Sidebar State
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  const loadInitialData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [{ workspaces: wsData }, summaryData, { invitations: invData }] = await Promise.all([
        kanbanApi.listWorkspaces(token),
        kanbanApi.getDashboardSummary(token),
        kanbanApi.listPendingInvitations(token),
      ]);
      setWorkspaces(wsData);
      setSummary(summaryData);
      setPendingInvitations(invData);
    } catch (err: any) {
      console.error("Failed to load tasks data", err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadInitialData();
  }, [token]);

  const handleCreateWorkspace = async () => {
    if (!token || !newWsName.trim()) return;
    try {
      const res = await kanbanApi.createWorkspace(token, newWsName, "");
      setWorkspaces((prev) => [...prev, res.workspace]);
      setIsCreatingWorkspace(false);
      setNewWsName("");
      setSelectedWorkspaceId(res.workspace.id);
      if (isMobile) setIsSidebarVisible(false);
    } catch (err: any) {
      Alert.alert("Error", "Failed to create workspace: " + err.message);
    }
  };

  const handleRenameWorkspace = async () => {
    if (!token || isRenamingWorkspace === null || !newWsName.trim()) return;
    try {
      const res = await kanbanApi.updateWorkspace(token, isRenamingWorkspace, newWsName, "");
      setWorkspaces((prev) => prev.map(w => w.id === isRenamingWorkspace ? res.workspace : w));
      setIsRenamingWorkspace(null);
      setNewWsName("");
    } catch (err: any) {
      Alert.alert("Error", "Failed to rename: " + err.message);
    }
  };

  const handleDeleteWorkspace = (id: number, name: string) => {
    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
             try {
               await kanbanApi.deleteWorkspace(token!, id);
               setWorkspaces((prev) => prev.filter(w => w.id !== id));
               if (selectedWorkspaceId === id) setSelectedWorkspaceId(null);
             } catch (err: any) {
               Alert.alert("Error", err.message);
             }
          }
        }
      ]
    );
  };

  const s = getStyles(colors, isMobile);

  const renderSidebar = () => (
    <View style={s.sidebar}>
      <View style={s.sidebarHeader}>
        <Text style={s.sidebarTitle}>Projects</Text>
        <TouchableOpacity onPress={() => setIsCreatingWorkspace(true)}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[s.workspaceItem, !selectedWorkspaceId && s.workspaceItemActive]}
          onPress={() => {
            setSelectedWorkspaceId(null);
            if (isMobile) setIsSidebarVisible(false);
          }}
        >
          <Ionicons 
            name="apps-outline" 
            size={18} 
            color={!selectedWorkspaceId ? colors.primary : colors.textMuted} 
          />
          <Text style={[s.workspaceLabel, !selectedWorkspaceId && s.workspaceLabelActive]}>
            Dashboard Overview
          </Text>
        </TouchableOpacity>

        <View style={s.divider} />

        {workspaces.map((ws) => (
          <View key={ws.id} style={[s.workspaceItemContainer, selectedWorkspaceId === ws.id && s.workspaceItemActive]}>
            <TouchableOpacity
              style={s.workspaceItemInner}
              onPress={() => {
                setSelectedWorkspaceId(ws.id);
                if (isMobile) setIsSidebarVisible(false);
              }}
            >
              <View style={[s.projectIcon, { backgroundColor: colors.primaryBg }]}>
                <Text style={s.projectIconText}>{ws.name.charAt(0).toUpperCase()}</Text>
              </View>
              <Text 
                style={[s.workspaceLabel, selectedWorkspaceId === ws.id && s.workspaceLabelActive]}
                numberOfLines={1}
              >
                {ws.name}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={s.wsActionBtn}
              onPress={() => {
                setIsRenamingWorkspace(ws.id);
                setNewWsName(ws.name);
              }}
            >
              <Ionicons name="settings-outline" size={14} color={colors.textSubtle} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  if (loading && !selectedWorkspaceId) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Sidebar - Desktop or Mobile Modal */}
      {!isMobile ? renderSidebar() : (
        <Modal
          visible={isSidebarVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsSidebarVisible(false)}
        >
          <View style={s.drawerOverlay}>
            <TouchableOpacity 
              activeOpacity={1} 
              style={s.drawerBackdrop} 
              onPress={() => setIsSidebarVisible(false)} 
            />
            <View style={s.drawerContainer}>
              {renderSidebar()}
            </View>
          </View>
        </Modal>
      )}

      {/* Main Content Area */}
      <View style={s.main}>
        {/* Mobile Top Bar */}
        {isMobile && (
          <View style={s.mobileHeader}>
            <TouchableOpacity onPress={() => setIsSidebarVisible(true)} style={s.menuBtn}>
              <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>
              {selectedWorkspaceId 
                ? (workspaces.find(w => w.id === selectedWorkspaceId)?.name || "Project")
                : "Mission Control"}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        )}

        {selectedWorkspaceId ? (
          <KanbanBoard 
            workspaceId={selectedWorkspaceId} 
            onBack={() => setSelectedWorkspaceId(null)} 
          />
        ) : (
          <ScrollView contentContainerStyle={s.dashboardContent}>
            <Text style={s.pageTitle}>Dashboard overview</Text>
            
            <View style={s.statsGrid}>
              <View style={s.statCard}>
                <Text style={s.statValue}>{summary?.workspaces_count || 0}</Text>
                <Text style={s.statLabel}>Projects</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{summary?.active_tasks || 0}</Text>
                <Text style={s.statLabel}>Active tasks</Text>
              </View>
              <View style={[s.statCard, summary?.overdue_tasks ? s.statCardAlert : {}]}>
                <Text style={[s.statValue, summary?.overdue_tasks ? s.statValueAlert : {}]}>
                  {summary?.overdue_tasks || 0}
                </Text>
                <Text style={s.statLabel}>Overdue</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statValue}>{summary?.completed_this_week || 0}</Text>
                <Text style={s.statLabel}>Done this week</Text>
              </View>
            </View>

            {/* Invitations */}
            {pendingInvitations.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Invitations ({pendingInvitations.length})</Text>
                <View style={s.invitationList}>
                  {pendingInvitations.map((inv) => (
                    <View key={inv.id} style={s.invitationCard}>
                      <Text style={s.invitationText}>
                        <Text style={{ fontFamily: Fonts.bold }}>{inv.sender_name}</Text> invited you to 
                        <Text style={{ fontFamily: Fonts.bold }}> {inv.workspace_name}</Text>
                      </Text>
                      <View style={s.invitationActions}>
                        <TouchableOpacity style={s.acceptBtn} onPress={() => {}}>
                          <Text style={s.acceptBtnText}>Join</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Text style={s.sectionTitle}>What's coming up</Text>
            {summary?.upcoming_tasks && summary.upcoming_tasks.length > 0 ? (
              summary.upcoming_tasks.map((task) => (
                <View key={task.id} style={s.upcomingTask}>
                  <View style={s.taskInfo}>
                    <Text style={s.upcomingTaskTitle}>{task.title}</Text>
                    <Text style={s.upcomingTaskMeta}>{task.workspace_name} • {task.column_name}</Text>
                  </View>
                  <View style={[s.priorityBadge, s[`priority_${task.priority}` as keyof typeof s]]}>
                    <Text style={s.priorityText}>{task.priority}</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="checkmark-done-outline" size={40} color={colors.textSubtle} />
                <Text style={s.emptyStateText}>You're all caught up!</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Workspace Modals */}
      {(isCreatingWorkspace || isRenamingWorkspace !== null) && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>{isRenamingWorkspace !== null ? "Rename Project" : "New Project"}</Text>
            <TextInput
              style={s.input}
              placeholder="Project Name"
              value={newWsName}
              onChangeText={setNewWsName}
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => {
                setIsCreatingWorkspace(false);
                setIsRenamingWorkspace(null);
              }}>
                <Text style={[s.modalBtnText, { color: colors.textSubtle }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.createBtn} onPress={isRenamingWorkspace !== null ? handleRenameWorkspace : handleCreateWorkspace}>
                <Text style={s.createBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const getStyles = (colors: any, isMobile: boolean) =>
  StyleSheet.create({
    container: { flex: 1, flexDirection: isMobile ? "column" : "row", backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    sidebar: {
      width: isMobile ? '100%' : 240,
      height: '100%',
      borderRightWidth: isMobile ? 0 : 1,
      borderRightColor: colors.border,
      backgroundColor: colors.surface,
      paddingTop: isMobile ? 40 : 20,
    },
    sidebarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 20 },
    sidebarTitle: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textSubtle, textTransform: "uppercase", letterSpacing: 1 },
    workspaceItemContainer: { flexDirection: "row", alignItems: "center", paddingRight: 8 },
    workspaceItemInner: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    workspaceItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    workspaceItemActive: { backgroundColor: colors.surfaceHover },
    workspaceLabel: { fontSize: 14, fontFamily: Fonts.medium, color: colors.textMuted, flex: 1 },
    workspaceLabelActive: { color: colors.primary, fontFamily: Fonts.bold },
    wsActionBtn: { padding: 8 },
    projectIcon: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
    projectIconText: { fontSize: 13, fontFamily: Fonts.bold, color: colors.primary },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12, marginHorizontal: 20 },
    main: { flex: 1 },
    mobileHeader: { height: 60, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    menuBtn: { padding: 8 },
    headerTitle: { fontSize: 16, fontFamily: Fonts.bold, color: colors.text },
    dashboardContent: { padding: isMobile ? 16 : 32, maxWidth: 1000, alignSelf: 'center', width: '100%' },
    pageTitle: { fontSize: isMobile ? 22 : 28, fontFamily: Fonts.bold, color: colors.text, marginBottom: 24 },
    section: { marginBottom: 32 },
    statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 },
    statCard: { flex: 1, minWidth: isMobile ? '45%' : 160, backgroundColor: colors.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: colors.border },
    statCardAlert: { borderColor: '#ef444433', backgroundColor: '#ef444408' },
    statValue: { fontSize: 28, fontFamily: Fonts.bold, color: colors.text, marginBottom: 2 },
    statValueAlert: { color: '#ef4444' },
    statLabel: { fontSize: 12, fontFamily: Fonts.medium, color: colors.textSubtle },
    sectionTitle: { fontSize: 16, fontFamily: Fonts.bold, color: colors.text, marginBottom: 12 },
    invitationList: { gap: 12 },
    invitationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, justifyContent: 'space-between' },
    invitationText: { fontSize: 13, color: colors.text, flex: 1, marginRight: 12 },
    invitationActions: {},
    acceptBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    acceptBtnText: { color: '#fff', fontSize: 12, fontFamily: Fonts.bold },
    upcomingTask: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    taskInfo: { flex: 1 },
    upcomingTaskTitle: { fontSize: 14, fontFamily: Fonts.medium, color: colors.text, marginBottom: 2 },
    upcomingTaskMeta: { fontSize: 11, fontFamily: Fonts.regular, color: colors.textSubtle },
    priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    priority_low: { backgroundColor: colors.surfaceHover },
    priority_medium: { backgroundColor: colors.primaryBg },
    priority_high: { backgroundColor: '#ef444422' },
    priority_urgent: { backgroundColor: '#ef444444' },
    priorityText: { fontSize: 10, fontFamily: Fonts.bold, color: colors.text, textTransform: 'uppercase' },
    emptyState: { alignItems: 'center', padding: 40, opacity: 0.6 },
    emptyStateText: { marginTop: 12, fontFamily: Fonts.medium, color: colors.textSubtle },
    drawerOverlay: { flex: 1 },
    drawerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    drawerContainer: { width: 280, height: '100%', backgroundColor: colors.surface },
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { width: isMobile ? '90%' : 400, backgroundColor: colors.surface, borderRadius: 16, padding: 24 },
    modalTitle: { fontSize: 18, fontFamily: Fonts.bold, color: colors.text, marginBottom: 20 },
    input: { height: 48, backgroundColor: colors.inputBg, borderRadius: 10, paddingHorizontal: 16, fontSize: 15, color: colors.text, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
    modalBtnText: { fontSize: 14, fontFamily: Fonts.semibold },
    createBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    createBtnText: { color: '#fff', fontSize: 14, fontFamily: Fonts.bold }
  });
