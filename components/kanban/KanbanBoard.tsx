import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  GestureResponderEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from "@hello-pangea/dnd";
import { Fonts } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { kanbanApi, WorkspaceDetail, Task, BoardColumn } from "../../services/api";
import TaskCard from "./TaskCard";
import TaskDetailModal from "./TaskDetailModal";
import CreateTaskModal from "./CreateTaskModal";
import InviteMemberModal from "./InviteMemberModal";
import WorkspaceAnalytics from "./WorkspaceAnalytics";
import TaskListView from "./TaskListView";
import CreateColumnModal from "./CreateColumnModal";

interface KanbanBoardProps {
  workspaceId: number;
  workspaceName?: string;
  onBack?: () => void;
}

type BoardTab = "summary" | "list" | "board" | "timeline";

export default function KanbanBoard({ workspaceId, workspaceName, onBack }: KanbanBoardProps) {
  const { colors } = useTheme();
  const { token } = useAuth();
  
  const [board, setBoard] = useState<WorkspaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<BoardTab>("board");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [createTaskColumnId, setCreateTaskColumnId] = useState<number | null>(null);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [isCreateColumnModalVisible, setIsCreateColumnModalVisible] = useState(false);
  const [columnToEdit, setColumnToEdit] = useState<BoardColumn | null>(null);
  
  // Custom Menu state
  const [activeMenuColumn, setActiveMenuColumn] = useState<BoardColumn | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadBoard = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await kanbanApi.getWorkspace(token, workspaceId);
      data.columns.sort((a, b) => a.position - b.position);
      data.tasks.sort((a, b) => a.position - b.position);
      setBoard(data);
    } catch (err: any) {
      console.error("Failed to load board", err.message);
    } finally {
      setLoading(false);
    }
  }, [token, workspaceId]);

  useEffect(() => {
    loadBoard();
  }, [workspaceId]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = parseInt(draggableId);
    const newColumnId = parseInt(destination.droppableId);
    const newPosition = destination.index;

    if (!board) return;
    const newTasks = Array.from(board.tasks);
    const movedTaskIndex = newTasks.findIndex(t => t.id === taskId);
    if (movedTaskIndex === -1) return;

    const [movedTask] = newTasks.splice(movedTaskIndex, 1);
    const updatedTask = { ...movedTask, column_id: newColumnId, position: newPosition };
    newTasks.splice(destination.index, 0, updatedTask);
    
    setBoard({ ...board, tasks: newTasks });

    try {
      if (!token) return;
      await kanbanApi.updateTask(token, taskId, {
        column_id: newColumnId,
        position: newPosition,
      });
    } catch (err: any) {
      console.error("Sync failed", err.message);
      loadBoard();
    }
  };

  const handleColumnAction = (event: GestureResponderEvent, column: BoardColumn) => {
     const { pageX, pageY } = event.nativeEvent;
     setMenuPos({ x: pageX, y: pageY });
     setActiveMenuColumn(column);
     setIsDeleteConfirmVisible(false);
  };

  const confirmDeleteColumn = async () => {
    if (!token || !activeMenuColumn) return;
    try {
      setIsDeleting(true);
      console.log(`[BOARD] Hitting DELETE API for column ID: ${activeMenuColumn.id}`);
      await kanbanApi.deleteColumn(token, activeMenuColumn.id);
      
      console.log(`[BOARD] Deletion successful, refreshing board...`);
      await loadBoard();
      
      setActiveMenuColumn(null);
      setIsDeleteConfirmVisible(false);
    } catch (err: any) {
      console.error("[BOARD] Failed to delete column", err.message);
      Alert.alert("Error", err.message || "Could not delete column");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTasks = board?.tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const s = getStyles(colors, menuPos);

  if (loading && !board) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!board) return null;

  return (
    <View style={s.container}>
      {/* Top Tab Navigation */}
      <View style={s.tabBar}>
        <TouchableOpacity style={s.backBtnSmall} onPress={onBack}>
          <Ionicons name="chevron-back" size={18} color={colors.textSubtle} />
        </TouchableOpacity>
        
        <View style={s.tabs}>
          {(["summary", "list", "board", "timeline"] as BoardTab[]).map((tab) => (
            <TouchableOpacity 
              key={tab} 
              style={[s.tabItem, activeTab === tab && s.tabItemActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTab === tab && <View style={s.activeTabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Control Bar */}
      <View style={s.controlBar}>
        <View style={s.searchContainer}>
          <Ionicons name="search" size={16} color={colors.textSubtle} style={s.searchIcon} />
          <TextInput 
            style={s.searchInput}
            placeholder="Search board"
            placeholderTextColor={colors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={s.controlsRight}>
          <View style={s.memberList}>
            {board.members.slice(0, 5).map((m) => (
              <View key={m.id} style={[s.avatar, { backgroundColor: colors.surfaceHover }]}>
                <Text style={s.avatarText}>
                  {(m.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
            {board.members.length > 5 && (
              <View style={[s.avatar, s.avatarMore]}>
                <Text style={s.avatarMoreText}>+{board.members.length - 5}</Text>
              </View>
            )}
            <TouchableOpacity 
              style={s.addMemberBtn}
              onPress={() => setIsInviteModalVisible(true)}
            >
              <Ionicons name="person-add" size={16} color={colors.textSubtle} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.filterBtn}>
            <Ionicons name="filter" size={16} color={colors.text} />
            <Text style={s.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View style={s.content}>
        {activeTab === "summary" && (
          <WorkspaceAnalytics workspaceId={workspaceId} />
        )}

        {activeTab === "list" && (
          <TaskListView 
            tasks={filteredTasks} 
            onTaskPress={(tid) => setSelectedTaskId(tid)} 
          />
        )}

        {activeTab === "board" && (
          <DragDropContext onDragEnd={onDragEnd}>
            <ScrollView horizontal contentContainerStyle={s.boardScroll} showsHorizontalScrollIndicator={true}>
              {board.columns.map((column) => (
                <View key={column.id} style={s.column}>
                  <View style={s.columnHeader}>
                    <View style={[s.columnIndicator, { backgroundColor: column.color || colors.primary }]} />
                    <Text style={s.columnTitle}>{column.name.toUpperCase()}</Text>
                    <View style={[s.countBadge, { backgroundColor: colors.surfaceHover }]}>
                      <Text style={s.countText}>
                        {filteredTasks.filter((t) => t.column_id === column.id).length}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={s.columnAction}
                      onPress={(e) => handleColumnAction(e, column)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSubtle} />
                    </TouchableOpacity>
                  </View>

                  <Droppable droppableId={String(column.id)}>
                    {(provided, snapshot) => {
                      const containerStyle = [
                        s.taskList,
                        snapshot.isDraggingOver && { backgroundColor: colors.surfaceHover }
                      ];
                      
                      if (Platform.OS === 'web') {
                        return (
                          <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            style={StyleSheet.flatten(containerStyle) as any}
                          >
                            {filteredTasks
                              .filter((t) => t.column_id === column.id)
                              .sort((a, b) => a.position - b.position)
                              .map((task, index) => (
                                <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                                  {(provided, snapshot) => {
                                    const content = (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={{
                                          ...provided.draggableProps.style,
                                          ...StyleSheet.flatten(s.taskContainer),
                                          opacity: snapshot.isDragging ? 0.9 : 1,
                                          cursor: 'grab',
                                          zIndex: 9999,
                                        } as any}
                                      >
                                        <TaskCard task={task} onPress={() => setSelectedTaskId(task.id)} />
                                      </div>
                                    );
                                    if (snapshot.isDragging && typeof document !== 'undefined') {
                                      const { createPortal } = require('react-dom');
                                      return createPortal(content, document.body);
                                    }
                                    return content;
                                  }}
                                </Draggable>
                              ))}
                            {provided.placeholder}
                            <TouchableOpacity style={s.addTaskBtn} onPress={() => setCreateTaskColumnId(column.id)}>
                              <Ionicons name="add" size={18} color={colors.textSubtle} />
                              <Text style={s.addTaskText}>Create task</Text>
                            </TouchableOpacity>
                          </div>
                        );
                      }

                      return (
                        <View {...provided.droppableProps} ref={provided.innerRef as any} style={containerStyle}>
                          {filteredTasks
                            .filter((t) => t.column_id === column.id)
                            .sort((a, b) => a.position - b.position)
                            .map((task, index) => (
                              <Draggable key={task.id} draggableId={String(task.id)} index={index}>
                                {(provided, snapshot) => (
                                  <View ref={provided.innerRef as any} {...provided.draggableProps} {...provided.dragHandleProps} style={[provided.draggableProps.style as any, snapshot.isDragging && { opacity: 0.8 }]}>
                                    <TaskCard task={task} onPress={() => setSelectedTaskId(task.id)} />
                                  </View>
                                )}
                              </Draggable>
                            ))}
                          {provided.placeholder}
                        </View>
                      )
                    }}
                  </Droppable>
                </View>
              ))}
              <TouchableOpacity style={s.addColumnBtn} onPress={() => { setColumnToEdit(null); setIsCreateColumnModalVisible(true); }}>
                  <Ionicons name="add" size={24} color={colors.textSubtle} />
              </TouchableOpacity>
            </ScrollView>
          </DragDropContext>
        )}

        {activeTab === "timeline" && (
           <View style={s.center}>
             <Ionicons name="time-outline" size={48} color={colors.textSubtle} />
             <Text style={s.msg}>Timeline view coming soon</Text>
           </View>
        )}
      </View>

      {/* Column Context Menu */}
      {activeMenuColumn && (
        <Modal transparent visible={!!activeMenuColumn} animationType="fade" onRequestClose={() => setActiveMenuColumn(null)}>
           <TouchableWithoutFeedback onPress={() => setActiveMenuColumn(null)}>
              <View style={s.menuOverlay}>
                 <TouchableWithoutFeedback>
                    <View style={s.menuContainer}>
                       {isDeleteConfirmVisible ? (
                          <View style={s.confirmBox}>
                             <Text style={s.confirmTitle}>Delete Column?</Text>
                             <Text style={s.confirmSub}>All tasks in this section will be removed permanently.</Text>
                             <View style={s.confirmActions}>
                                <TouchableOpacity style={s.cancelBtnSmall} onPress={() => setIsDeleteConfirmVisible(false)}>
                                   <Text style={s.cancelBtnTextSmall}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.deleteBtnSmall} onPress={confirmDeleteColumn} disabled={isDeleting}>
                                   <Text style={s.deleteBtnTextSmall}>{isDeleting ? "Deleting..." : "Confirm Delete"}</Text>
                                </TouchableOpacity>
                             </View>
                          </View>
                       ) : (
                          <>
                             <View style={s.menuHeader}>
                                <Text style={s.menuTitle}>{activeMenuColumn.name}</Text>
                             </View>
                             <TouchableOpacity style={s.menuItem} onPress={() => { setColumnToEdit(activeMenuColumn); setActiveMenuColumn(null); setIsCreateColumnModalVisible(true); }}>
                                <Ionicons name="pencil-outline" size={18} color={colors.text} />
                                <Text style={s.menuItemText}>Change Name</Text>
                             </TouchableOpacity>
                             <TouchableOpacity style={s.menuItem} onPress={() => { setColumnToEdit(activeMenuColumn); setActiveMenuColumn(null); setIsCreateColumnModalVisible(true); }}>
                                <Ionicons name="color-palette-outline" size={18} color={colors.text} />
                                <Text style={s.menuItemText}>Change Color</Text>
                             </TouchableOpacity>
                             <View style={s.menuDivider} />
                             <TouchableOpacity style={[s.menuItem]} onPress={() => setIsDeleteConfirmVisible(true)}>
                                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                <Text style={[s.menuItemText, { color: '#ef4444' }]}>Delete Column</Text>
                             </TouchableOpacity>
                          </>
                       )}
                    </View>
                 </TouchableWithoutFeedback>
              </View>
           </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Modals */}
      {createTaskColumnId && (
        <CreateTaskModal
          visible={!!createTaskColumnId}
          workspaceId={workspaceId}
          columnId={createTaskColumnId}
          onClose={() => setCreateTaskColumnId(null)}
          onSuccess={loadBoard}
        />
      )}

      {isInviteModalVisible && (
        <InviteMemberModal
          visible={isInviteModalVisible}
          workspaceId={workspaceId}
          onClose={() => setIsInviteModalVisible(false)}
        />
      )}

      {isCreateColumnModalVisible && (
        <CreateColumnModal
          visible={isCreateColumnModalVisible}
          workspaceId={workspaceId}
          column={columnToEdit}
          currentColumnsCount={board.columns.length}
          onClose={() => { setColumnToEdit(null); setIsCreateColumnModalVisible(false); }}
          onSuccess={loadBoard}
        />
      )}

      {selectedTaskId && (
        <TaskDetailModal 
          taskId={selectedTaskId} 
          onClose={() => {
            setSelectedTaskId(null);
            loadBoard();
          }} 
        />
      )}
    </View>
  );
}

const getStyles = (colors: any, menuPos: { x: number, y: number }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
    tabBar: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 16, height: 48 },
    backBtnSmall: { padding: 8, marginRight: 8 },
    tabs: { flexDirection: 'row', height: '100%' },
    tabItem: { paddingHorizontal: 16, justifyContent: 'center', height: '100%', position: 'relative' },
    tabItemActive: {},
    tabText: { fontSize: 14, fontFamily: Fonts.medium, color: colors.textSubtle },
    tabTextActive: { color: colors.primary, fontFamily: Fonts.bold },
    activeTabIndicator: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 2, backgroundColor: colors.primary },
    controlBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceHover, borderRadius: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border, maxWidth: 300, flex: 1 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, height: 32, fontSize: 14, color: colors.text, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
    controlsRight: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    memberList: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.background, alignItems: "center", justifyContent: "center", marginLeft: -8 },
    avatarText: { fontSize: 10, fontFamily: Fonts.bold, color: colors.primary },
    avatarMore: { backgroundColor: colors.surfaceVariant },
    avatarMoreText: { fontSize: 9, fontFamily: Fonts.bold, color: colors.textSubtle },
    addMemberBtn: { marginLeft: 8, padding: 4 },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceHover, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
    filterBtnText: { fontSize: 14, fontFamily: Fonts.medium, color: colors.text },
    content: { flex: 1 },
    boardScroll: { padding: 24, paddingTop: 8 },
    column: { width: 280, marginRight: 16 },
    columnHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingHorizontal: 8 },
    columnIndicator: { width: 4, height: 16, borderRadius: 2, marginRight: 8 },
    columnTitle: { fontSize: 12, fontFamily: Fonts.bold, color: colors.textSubtle, letterSpacing: 0.5 },
    countBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
    countText: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textSubtle },
    columnAction: { marginLeft: "auto", padding: 8 },
    taskList: { minHeight: 100, borderRadius: 8, padding: 2 },
    taskContainer: { marginBottom: 8 },
    addTaskBtn: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 6, gap: 8, marginTop: 8 },
    addTaskText: { fontSize: 14, fontFamily: Fonts.medium, color: colors.textSubtle },
    addColumnBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
    msg: { fontSize: 14, color: colors.textSubtle, fontFamily: Fonts.medium, marginTop: 16 },
    // RELATIVE Menu Styles
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
    menuContainer: { 
      position: 'absolute',
      // Offset by roughly half width and full height of the icon
      top: Math.max(20, menuPos.y + 10), 
      left: Math.max(20, menuPos.x - 210), 
      backgroundColor: colors.surface, 
      borderRadius: 12, 
      width: 230, 
      padding: 4, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 8 }, 
      shadowOpacity: 0.2, 
      shadowRadius: 15, 
      elevation: 20, 
      borderWidth: 1, 
      borderColor: colors.border,
      zIndex: 99999,
    },
    menuHeader: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4 },
    menuTitle: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, gap: 12 },
    menuItemText: { fontSize: 14, fontFamily: Fonts.medium, color: colors.text },
    menuDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
    // Confirm Box Styles
    confirmBox: { padding: 16 },
    confirmTitle: { fontSize: 15, fontFamily: Fonts.bold, color: colors.text, marginBottom: 8 },
    confirmSub: { fontSize: 12, fontFamily: Fonts.regular, color: colors.textSubtle, lineHeight: 18, marginBottom: 16 },
    confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    cancelBtnSmall: { paddingHorizontal: 12, paddingVertical: 8 },
    cancelBtnTextSmall: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textSubtle },
    deleteBtnSmall: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
    deleteBtnTextSmall: { fontSize: 13, fontFamily: Fonts.bold, color: '#fff' }
  });
