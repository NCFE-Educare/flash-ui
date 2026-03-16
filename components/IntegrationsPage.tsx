import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { integrationsApi } from "../services/api";

const INTEGRATIONS = [
  {
    key: "gmail",
    label: "Gmail",
    icon: "https://img.icons8.com/color/48/gmail-new.png",
    statusKey: "gmailConnected",
    connect: integrationsApi.gmailConnect,
    disconnect: integrationsApi.gmailDisconnect,
    status: integrationsApi.gmailStatus,
  },
  {
    key: "sheets",
    label: "Google Sheets",
    icon: "https://img.icons8.com/color/48/google-sheets.png",
    statusKey: "sheetsConnected",
    connect: integrationsApi.sheetsConnect,
    disconnect: integrationsApi.sheetsDisconnect,
    status: integrationsApi.sheetsStatus,
  },
  {
    key: "docs",
    label: "Google Docs",
    icon: "https://img.icons8.com/color/48/google-docs.png",
    statusKey: "docsConnected",
    connect: integrationsApi.docsConnect,
    disconnect: integrationsApi.docsDisconnect,
    status: integrationsApi.docsStatus,
  },
  {
    key: "drive",
    label: "Google Drive",
    icon: "https://img.icons8.com/color/48/google-drive--v1.png",
    statusKey: "driveConnected",
    connect: integrationsApi.driveConnect,
    disconnect: integrationsApi.driveDisconnect,
    status: integrationsApi.driveStatus,
  },
  {
    key: "calendar",
    label: "Google Calendar",
    icon: "https://img.icons8.com/color/48/google-calendar--v2.png",
    statusKey: "calendarConnected",
    connect: integrationsApi.calendarConnect,
    disconnect: integrationsApi.calendarDisconnect,
    status: integrationsApi.calendarStatus,
  },
  {
    key: "slides",
    label: "Google Slides",
    icon: "https://img.icons8.com/color/48/google-slides.png",
    statusKey: "slidesConnected",
    connect: integrationsApi.slidesConnect,
    disconnect: integrationsApi.slidesDisconnect,
    status: integrationsApi.slidesStatus,
  },
  {
    key: "forms",
    label: "Google Forms",
    icon: "https://img.icons8.com/color/48/google-forms.png",
    statusKey: "formsConnected",
    connect: integrationsApi.formsConnect,
    disconnect: integrationsApi.formsDisconnect,
    status: integrationsApi.formsStatus,
  },
  {
    key: "meet",
    label: "Google Meet",
    icon: "https://img.icons8.com/color/48/google-meet--v1.png",
    statusKey: "meetConnected",
    connect: integrationsApi.meetConnect,
    disconnect: integrationsApi.meetDisconnect,
    status: integrationsApi.meetStatus,
  },
  {
    key: "classroom",
    label: "Google Classroom",
    icon: "https://img.icons8.com/color/48/google-classroom.png",
    statusKey: "classroomConnected",
    connect: integrationsApi.classroomConnect,
    disconnect: integrationsApi.classroomDisconnect,
    status: integrationsApi.classroomStatus,
  },
];

export default function IntegrationsPage() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Record<string, boolean>>({});

  const checkIntegrations = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const results: Record<string, boolean> = {};
      for (const int of INTEGRATIONS) {
        try {
          results[int.key] = await int.status(token);
        } catch {
          results[int.key] = false;
        }
      }
      setStatus(results);
    } catch (e) {
      console.error("Error checking integrations", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkIntegrations();
  }, [token]);

  const handleAction = async (int: (typeof INTEGRATIONS)[0]) => {
    if (!token) return;
    const connected = status[int.key];
    if (connected) {
      await int.disconnect(token);
      setStatus((prev) => ({ ...prev, [int.key]: false }));
    } else {
      try {
        const res = await int.connect(token);
        const url =
          res?.url ||
          (res as any)?.auth_url ||
          (typeof res === "string" ? res : null);
        if (url) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Invalid Google OAuth URL returned.");
        }
      } catch (e: any) {
        Alert.alert(`Error connecting ${int.label}`, e.message);
      }
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
        <Text style={s.title}>Integrations</Text>
        <Text style={s.subtitle}>
          Connect your Google services to use them with Cortex
        </Text>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={s.grid}>
          {INTEGRATIONS.map((int) => {
            const connected = status[int.key];
            return (
              <View key={int.key} style={s.item}>
                <View style={s.itemLeft}>
                  <Image
                    source={{ uri: int.icon }}
                    style={{ width: 28, height: 28 }}
                  />
                  <Text style={s.itemText}>{int.label}</Text>
                </View>
                {connected ? (
                  <View style={s.itemRight}>
                    <View style={s.activeBadge}>
                      <View style={s.activeDot} />
                      <Text style={s.activeText}>Active</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleAction(int)}
                      style={s.iconBtn}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={colors.textError || "#ff4444"}
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[s.btn, s.btnConnect]}
                    onPress={() => handleAction(int)}
                  >
                    <Text style={[s.btnText, s.btnTextConnect]}>Connect</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
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
    grid: {
      gap: 12,
    },
    item: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    itemText: {
      fontSize: 15,
      fontFamily: Fonts.medium,
      color: colors.text,
    },
    itemRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    btn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    btnConnect: {
      backgroundColor: colors.primary,
    },
    btnText: {
      fontSize: 13,
      fontFamily: Fonts.medium,
    },
    btnTextConnect: {
      color: "#fff",
    },
    activeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
    },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#22c55e",
    },
    activeText: {
      fontSize: 12,
      fontFamily: Fonts.medium,
      color: "#22c55e",
    },
    iconBtn: {
      padding: 4,
    },
  });
