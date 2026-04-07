import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { kanbanApi } from "../../services/api";

interface CreateTaskModalProps {
  visible: boolean;
  workspaceId: number;
  columnId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateTaskModal({
  visible,
  workspaceId,
  columnId,
  onClose,
  onSuccess,
}: CreateTaskModalProps) {
  const { colors } = useTheme();
  const { token } = useAuth();
  
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!token || !title.trim()) return;
    try {
      setLoading(true);
      await kanbanApi.createTask(token, workspaceId, {
        title,
        column_id: columnId,
        priority,
        position: 0, // Top of column
      });
      setTitle("");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to create task", err.message);
    } finally {
      setLoading(false);
    }
  };

  const s = getStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>Create Task</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={s.content}>
            <Text style={s.label}>Title</Text>
            <TextInput
              style={s.input}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <Text style={s.label}>Priority</Text>
            <View style={s.priorityRow}>
              {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[s.priorityBtn, priority === p && s.priorityBtnActive]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[s.priorityBtnText, priority === p && s.priorityBtnTextActive]}>
                    {p.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.footer}>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.createBtn, !title.trim() && s.createBtnDisabled]} 
              onPress={handleCreate}
              disabled={loading || !title.trim()}
            >
              <Text style={s.createText}>{loading ? "Creating..." : "Create"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    container: {
      width: Platform.OS === 'web' ? 450 : '90%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontFamily: Fonts.bold,
      color: colors.text,
    },
    content: {
      padding: 20,
    },
    label: {
      fontSize: 12,
      fontFamily: Fonts.bold,
      color: colors.textSubtle,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    input: {
      height: 48,
      backgroundColor: colors.inputBg,
      borderRadius: 10,
      paddingHorizontal: 16,
      fontSize: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 24,
      ...({ outlineWidth: 0 } as any),
    },
    priorityRow: {
      flexDirection: "row",
      gap: 10,
    },
    priorityBtn: {
      flex: 1,
      height: 36,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceHover,
      borderWidth: 1,
      borderColor: colors.border,
    },
    priorityBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    priorityBtnText: {
      fontSize: 11,
      fontFamily: Fonts.bold,
      color: colors.textSubtle,
    },
    priorityBtnTextActive: {
      color: "#fff",
    },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      padding: 20,
      gap: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cancelText: {
      fontSize: 15,
      fontFamily: Fonts.medium,
      color: colors.textSubtle,
    },
    createBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
    },
    createBtnDisabled: {
      opacity: 0.5,
    },
    createText: {
      color: "#fff",
      fontSize: 15,
      fontFamily: Fonts.bold,
    },
  });
