import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { memoryApi, Memory } from "../services/api";

export default function MemoriesPage() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Edit State
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const loadMemories = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await memoryApi.list(token);
      setMemories(Array.isArray(data) ? data : (data as any)?.memories ?? []);
    } catch (e) {
      console.error("Failed to load memories", e);
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleSearch = async () => {
    if (!token) return;
    if (!searchQuery.trim()) {
      loadMemories();
      return;
    }
    setLoading(true);
    try {
      const data = await memoryApi.search(token, searchQuery);
      setMemories(Array.isArray(data) ? data : (data as any)?.memories || (data as any)?.results || []);
    } catch (e) {
      console.error("Search failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (m: Memory) => {
    if (!token) return;
    try {
      setDeletingId(m.id);
      await memoryApi.delete(token, m.id);
      setMemories((prev) => prev.filter((x) => x.id !== m.id));
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete memory");
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (m: Memory) => {
    setEditingMemory(m);
    setEditValue(m.memory);
  };

  const saveEdit = async () => {
    if (!token || !editingMemory) return;
    setSavingEdit(true);
    try {
      const updated = await memoryApi.update(token, editingMemory.id, editValue);
      setMemories((prev) => prev.map(m => m.id === updated.id ? updated : m));
      setEditingMemory(null);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update memory");
    } finally {
      setSavingEdit(false);
    }
  };

  const s = getStyles(colors);

  return (
    <View style={s.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Text style={s.title}>Memories</Text>
          <Text style={s.subtitle}>
            Things Cortex has learned about you to personalize your experience
          </Text>
        </View>

        <View style={s.searchRow}>
            <View style={s.searchContainer}>
                <Ionicons name="search-outline" size={18} color={colors.textMuted} />
                <TextInput
                    style={s.searchInput}
                    placeholder="Search memories..."
                    placeholderTextColor={colors.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                />
            </View>
            <TouchableOpacity style={s.searchBtn} onPress={handleSearch}>
                <Text style={s.searchBtnText}>Search</Text>
            </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : memories.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="bulb-outline" size={48} color={colors.textMuted} />
            <Text style={s.emptyText}>No memories yet</Text>
            <Text style={s.emptySubtext}>
              As you talk to Cortex, it will remember important facts about you here.
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            {memories.map((m) => (
              <View key={m.id} style={s.item}>
                <View style={s.itemContent}>
                  <Text style={s.itemText}>{m.memory}</Text>
                  {m.categories && m.categories.length > 0 && (
                    <Text style={s.itemCategory}>{m.categories.join(", ")}</Text>
                  )}
                </View>
                <View style={s.actions}>
                    <TouchableOpacity
                        onPress={() => startEdit(m)}
                        style={s.actionBtn}
                    >
                        <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDelete(m)}
                        disabled={deletingId === m.id}
                        style={s.actionBtn}
                    >
                        {deletingId === m.id ? (
                            <ActivityIndicator size="small" color={colors.textMuted} />
                        ) : (
                            <Ionicons name="trash-outline" size={18} color={colors.error} />
                        )}
                    </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={!!editingMemory}
        transparent
        animationType="fade"
      >
        <View style={s.modalOverlay}>
            <View style={s.modalContent}>
                <Text style={s.modalTitle}>Edit Memory</Text>
                <TextInput
                    style={s.editInput}
                    multiline
                    value={editValue}
                    onChangeText={setEditValue}
                    autoFocus
                />
                <View style={s.modalButtons}>
                    <TouchableOpacity 
                        style={[s.modalBtn, s.cancelBtn]} 
                        onPress={() => setEditingMemory(null)}
                    >
                        <Text style={s.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[s.modalBtn, s.saveBtn]} 
                        onPress={saveEdit}
                        disabled={savingEdit}
                    >
                        {savingEdit ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={s.saveBtnText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 24,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontFamily: Fonts.bold,
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      fontFamily: Fonts.regular,
      color: colors.textMuted,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.text,
    },
    searchBtn: {
        backgroundColor: colors.text,
        borderRadius: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBtnText: {
        color: colors.textInverse,
        fontSize: 14,
        fontFamily: Fonts.medium,
    },
    loading: {
      padding: 40,
      alignItems: "center",
    },
    empty: {
      alignItems: "center",
      paddingVertical: 48,
    },
    emptyText: {
      fontSize: 16,
      fontFamily: Fonts.medium,
      color: colors.textMuted,
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 13,
      fontFamily: Fonts.regular,
      color: colors.textSubtle,
      marginTop: 8,
      textAlign: "center",
      paddingHorizontal: 24,
    },
    list: {
      gap: 12,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemContent: {
      flex: 1,
    },
    itemText: {
      fontSize: 15,
      fontFamily: Fonts.medium,
      color: colors.text,
    },
    itemCategory: {
      fontSize: 11,
      fontFamily: Fonts.bold,
      color: colors.primary,
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionBtn: {
      padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 500,
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: colors.text,
        marginBottom: 16,
    },
    editInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        fontFamily: Fonts.regular,
        color: colors.text,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 20,
    },
    modalBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: 'transparent',
    },
    cancelBtnText: {
        color: colors.textMuted,
        fontFamily: Fonts.medium,
    },
    saveBtn: {
        backgroundColor: colors.text,
    },
    saveBtnText: {
        color: colors.textInverse,
        fontFamily: Fonts.medium,
    }
  });
