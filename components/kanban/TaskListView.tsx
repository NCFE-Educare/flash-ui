import React from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Platform 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { Task } from "../../services/api";
import { Fonts } from "../../constants/theme";

interface TaskListViewProps {
  tasks: Task[];
  onTaskPress: (taskId: number) => void;
}

export default function TaskListView({ tasks, onTaskPress }: TaskListViewProps) {
  const { colors } = useTheme();
  const s = getStyles(colors);

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.table}>
        <View style={s.tableHeader}>
          <Text style={[s.headerCell, { flex: 0.6 }]}>Key</Text>
          <Text style={[s.headerCell, { flex: 2.5 }]}>Summary</Text>
          <Text style={[s.headerCell, { flex: 1.2 }]}>Assignee</Text>
          <Text style={[s.headerCell, { flex: 1.1 }]}>Status</Text>
          <Text style={[s.headerCell, { flex: 0.9 }]}>Priority</Text>
        </View>

        {tasks.length > 0 ? tasks.map((task) => (
          <TouchableOpacity 
            key={task.id} 
            style={s.row}
            onPress={() => onTaskPress(task.id)}
          >
            <Text style={[s.cell, s.keyText, { flex: 0.6 }]}>TS-{task.id}</Text>
            <Text style={[s.cell, s.summaryText, { flex: 2.5 }]} numberOfLines={1}>
              {task.title}
            </Text>
            <View style={[s.cell, s.userCell, { flex: 1.2 }]}>
               <View style={[s.avatar, { backgroundColor: colors.surfaceHover }]}>
                 <Text style={s.avatarText}>{task.assignee_name?.charAt(0) || "?"}</Text>
               </View>
               <Text style={s.cellText} numberOfLines={1} ellipsizeMode="tail">{task.assignee_name || "Unassigned"}</Text>
            </View>
            <View style={[s.cell, { flex: 1.1 }]}>
              <View style={[s.statusBadge, { backgroundColor: task.column_color || colors.surfaceHover }]}>
                <Text style={s.statusText} numberOfLines={1}>{task.column_name?.toUpperCase()}</Text>
              </View>
            </View>
            <View style={[s.cell, { flex: 0.9, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
               <Ionicons 
                name={task.priority === 'urgent' || task.priority === 'high' ? "chevron-up" : "remove"} 
                size={14} 
                color={task.priority === 'urgent' ? '#ef4444' : task.priority === 'high' ? '#ff9800' : '#3b82f6'} 
              />
              <Text style={[s.cellText, { fontSize: 11 }]} numberOfLines={1}>{task.priority.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        )) : (
          <View style={s.emptyRow}>
            <Text style={s.emptyText}>No tasks found in this project.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
    },
    table: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceHover,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerCell: {
      fontSize: 12,
      fontFamily: Fonts.bold,
      color: colors.textSubtle,
      textTransform: "uppercase",
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    cell: {
      paddingRight: 10,
    },
    cellText: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: colors.text,
    },
    keyText: {
      fontSize: 13,
      fontFamily: Fonts.medium,
      color: colors.textSubtle,
    },
    summaryText: {
      fontSize: 14,
      fontFamily: Fonts.semibold,
      color: colors.text,
    },
    userCell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 10,
      fontFamily: Fonts.bold,
      color: colors.primary,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: 'flex-start',
    },
    statusText: {
      fontSize: 10,
      fontFamily: Fonts.bold,
      color: colors.text,
    },
    emptyRow: {
      padding: 60,
      alignItems: 'center',
    },
    emptyText: {
      color: colors.textSubtle,
      fontFamily: Fonts.medium,
    },
  });
