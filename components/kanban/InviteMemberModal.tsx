import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { kanbanApi } from "../../services/api";

interface InviteMemberModalProps {
  visible: boolean;
  workspaceId: number;
  onClose: () => void;
}

export default function InviteMemberModal({
  visible,
  workspaceId,
  onClose,
}: InviteMemberModalProps) {
  const { colors } = useTheme();
  const { token } = useAuth();
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!token || !email.trim()) return;
    try {
      setLoading(true);
      const res = await kanbanApi.inviteMember(token, workspaceId, email);
      if (res.user_exists) {
        Alert.alert("Success", `${email} has been added to the project.`);
      } else {
        Alert.alert("Invitation Sent", `An invite has been sent to ${email}.`);
      }
      setEmail("");
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to invite member");
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
            <Text style={s.title}>Share Project</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={s.content}>
            <Text style={s.label}>Email Address</Text>
            <TextInput
              style={s.input}
              placeholder="name@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <Text style={s.hint}>
              Collaborators will be able to view, create, and move tasks in this workspace.
            </Text>
          </View>

          <View style={s.footer}>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.inviteBtn, !email.trim() && s.inviteBtnDisabled]} 
              onPress={handleInvite}
              disabled={loading || !email.trim()}
            >
              <Text style={s.inviteText}>{loading ? "Sending..." : "Send Invite"}</Text>
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
      marginBottom: 12,
      ...({ outlineWidth: 0 } as any),
    },
    hint: {
      fontSize: 12,
      fontFamily: Fonts.regular,
      color: colors.textSubtle,
      lineHeight: 18,
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
    inviteBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
    },
    inviteBtnDisabled: {
      opacity: 0.5,
    },
    inviteText: {
      color: "#fff",
      fontSize: 15,
      fontFamily: Fonts.bold,
    },
  });
