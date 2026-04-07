import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { Task } from "../../services/api";

interface TaskCardProps {
  task: Task;
  onPress: () => void;
}

export default function TaskCard({ task, onPress }: TaskCardProps) {
  const { colors, isDark } = useTheme();

  const getPriorityIcon = () => {
    switch (task.priority) {
      case "urgent":
        return <Ionicons name="chevron-up-circle" size={16} color="#ef4444" />;
      case "high":
        return <Ionicons name="chevron-up" size={16} color="#ef4444" />;
      case "medium":
        return <Ionicons name="remove" size={16} color="#3b82f6" />;
      case "low":
        return <Ionicons name="chevron-down" size={16} color="#10b981" />;
      default:
        return null;
    }
  };

  const s = getStyles(colors, isDark);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={s.title}>{task.title}</Text>
      
      <View style={s.footer}>
        <View style={s.meta}>
          {getPriorityIcon()}
          <Text style={s.taskId}>TS-{task.id}</Text>
        </View>

        {task.assignee_name && (
          <View style={[s.avatar, { backgroundColor: colors.primaryBg }]}>
            <Text style={s.avatarText}>{task.assignee_name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    title: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: colors.text,
      marginBottom: 12,
      lineHeight: 20,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    meta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    taskId: {
      fontSize: 11,
      fontFamily: Fonts.bold,
      color: colors.textSubtle,
      letterSpacing: 0.5,
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 10,
      fontFamily: Fonts.bold,
      color: colors.primary,
    },
  });
