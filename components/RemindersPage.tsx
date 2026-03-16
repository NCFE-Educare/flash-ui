import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { remindersApi, Reminder } from "../services/api";

function formatRemindAt(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
    }
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function RemindersPage() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadReminders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await remindersApi.list(token, true);
      setReminders(Array.isArray(data) ? data : (data as any)?.reminders ?? []);
    } catch (e) {
      console.error("Failed to load reminders", e);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleDelete = async (r: Reminder) => {
    if (!token) return;
    try {
      setDeletingId(r.id);
      await remindersApi.delete(token, r.id);
      setReminders((prev) => prev.filter((x) => x.id !== r.id));
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to cancel reminder");
    } finally {
      setDeletingId(null);
    }
  };

  const s = getStyles(colors);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <Text style={s.title}>Reminders</Text>
        <Text style={s.subtitle}>
          Reminders created when you ask Cortex to remind you about something
        </Text>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : reminders.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="alarm-outline" size={48} color={colors.textMuted} />
          <Text style={s.emptyText}>No reminders yet</Text>
          <Text style={s.emptySubtext}>
            Say things like &quot;remind me tomorrow at 9am about the meeting&quot; in chat
          </Text>
        </View>
      ) : (
        <View style={s.list}>
          {reminders.map((r) => (
            <View key={r.id} style={s.item}>
              <View style={s.itemContent}>
                <Text style={s.itemMessage}>{r.message}</Text>
                <Text style={s.itemTime}>{formatRemindAt(r.remind_at)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(r)}
                disabled={deletingId === r.id}
                style={s.cancelBtn}
              >
                {deletingId === r.id ? (
                  <ActivityIndicator size="small" color={colors.textMuted} />
                ) : (
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
    itemMessage: {
      fontSize: 15,
      fontFamily: Fonts.medium,
      color: colors.text,
    },
    itemTime: {
      fontSize: 13,
      fontFamily: Fonts.regular,
      color: colors.textMuted,
      marginTop: 4,
    },
    cancelBtn: {
      padding: 8,
    },
  });
