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

  const handleDeleteColumn = (column: BoardColumn) => {
    const tasksInColumn = board?.tasks.filter(t => t.column_id === column.id).length || 0;
    
    const message = tasksInColumn > 0 
      ? `This column has ${tasksInColumn} tasks. Deleting it will permanently remove all tasks within it. Are you sure?`
      : `Are you sure you want to delete the "${column.name}" column?`;

    Alert.alert(
      "Delete Column",
      message,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              if (!token) return;
              await kanbanApi.deleteColumn(token, column.id);
              loadBoard();
            } catch (err: any) {
              Alert.alert("Error", err.message);
            }
          }
        }
      ]
    );
  };

  const handleColumnAction = (column: BoardColumn) => {
    if (Platform.OS === 'web') {
       // On web, Alert.alert shows buttons sequentially. Let's use it for now as a simple menu.
       Alert.alert(
         column.name,
         "Column Actions",
         [
           { text: "Cancel", style: "cancel" },
           { text: "Rename", onPress: () => {
              setColumnToEdit(column);
              setIsCreateColumnModalVisible(true);
           }},
           { text: "Delete", style: "destructive", onPress: () => handleDeleteColumn(column) }
         ]
       );
    } else {
       Alert.alert(
         column.name,
         "",
         [
           { text: "Cancel", style: "cancel" },
           { text: "Rename Column", onPress: () => {
              setColumnToEdit(column);
              setIsCreateColumnModalVisible(true);
           }},
           { text: "Delete Column", style: "destructive", onPress: () => handleDeleteColumn(column) }
         ]
       );
    }
  };

  const filteredTasks = board?.tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const s = getStyles(colors);

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
        {/* Render logic remains the same */}
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
                      onPress={() => handleColumnAction(column)}
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

        {/* Existing timeline view logic */}
        {activeTab === "timeline" && (
           <View style={s.center}>
             <Ionicons name="time-outline" size={48} color={colors.textSubtle} />
             <Text style={s.msg}>Timeline view coming soon</Text>
           </View>
        )}
      </View>

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

const getStyles = (colors: any) =>
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
    columnAction: { marginLeft: "auto", padding: 4 },
    taskList: { minHeight: 100, borderRadius: 8, padding: 2 },
    taskContainer: { marginBottom: 8 },
    addTaskBtn: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 6, gap: 8, marginTop: 8 },
    addTaskText: { fontSize: 14, fontFamily: Fonts.medium, color: colors.textSubtle },
    addColumnBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
    msg: { fontSize: 14, color: colors.textSubtle, fontFamily: Fonts.medium, marginTop: 16 }
  });
