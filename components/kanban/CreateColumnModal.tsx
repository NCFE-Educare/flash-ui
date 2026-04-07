import React, { useState, useEffect } from "react";
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
import { kanbanApi, BoardColumn } from "../../services/api";

interface CreateColumnModalProps {
  visible: boolean;
  workspaceId: number;
  column?: BoardColumn | null; // Optional prop for Edit mode
  currentColumnsCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Yellow/Orange
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#6b7280", // Gray
];

export default function CreateColumnModal({
  visible,
  workspaceId,
  column,
  currentColumnsCount,
  onClose,
  onSuccess,
}: CreateColumnModalProps) {
  const { colors } = useTheme();
  const { token } = useAuth();
  
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  // Pre-fill if in Edit mode
  useEffect(() => {
    if (visible && column) {
      setName(column.name);
      setSelectedColor(column.color || PRESET_COLORS[0]);
    } else if (visible) {
      setName("");
      setSelectedColor(PRESET_COLORS[0]);
    }
  }, [visible, column]);

  const handleSave = async () => {
    if (!token || !name.trim()) return;
    try {
      setLoading(true);
      if (column) {
         // Update Mode
         await kanbanApi.updateColumn(
           token, 
           column.id, 
           name.trim(), 
           column.position, 
           selectedColor
         );
      } else {
         // Create Mode
         await kanbanApi.createColumn(
           token, 
           workspaceId, 
           name.trim(), 
           currentColumnsCount, 
           selectedColor
         );
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to save column", err.message);
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
            <Text style={s.title}>{column ? "Rename Column" : "Add Column"}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={s.content}>
            <Text style={s.label}>Stage Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Backlog, Doing..."
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={s.label}>Stage Color</Text>
            <View style={s.colorRow}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    s.colorOption, 
                    { backgroundColor: color },
                    selectedColor === color && s.colorOptionActive
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                   {selectedColor === color && (
                     <Ionicons name="checkmark" size={16} color="#fff" />
                   )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.footer}>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.createBtn, !name.trim() && s.createBtnDisabled]} 
              onPress={handleSave}
              disabled={loading || !name.trim()}
            >
              <Text style={s.createText}>
                {loading ? "Saving..." : (column ? "Save Changes" : "Add Column")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    container: { width: Platform.OS === 'web' ? 400 : '90%', backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 18, fontFamily: Fonts.bold, color: colors.text },
    content: { padding: 20 },
    label: { fontSize: 12, fontFamily: Fonts.bold, color: colors.textSubtle, textTransform: "uppercase", marginBottom: 12 },
    input: { height: 48, backgroundColor: colors.inputBg, borderRadius: 10, paddingHorizontal: 16, fontSize: 15, color: colors.text, borderBottomWidth: 1, borderColor: colors.border, marginBottom: 24, ...({ outlineWidth: 0 } as any) },
    colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
    colorOption: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    colorOptionActive: { borderColor: '#fff' },
    footer: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", padding: 20, gap: 20, borderTopWidth: 1, borderTopColor: colors.border },
    cancelText: { fontSize: 15, fontFamily: Fonts.medium, color: colors.textSubtle },
    createBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
    createBtnDisabled: { opacity: 0.5 },
    createText: { color: "#fff", fontSize: 15, fontFamily: Fonts.bold }
  });
