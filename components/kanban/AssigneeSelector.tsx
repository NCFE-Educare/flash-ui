import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";
import { WorkspaceMember } from "../../services/api";

interface AssigneeSelectorProps {
  visible: boolean;
  members: WorkspaceMember[];
  selectedUserId?: number | null;
  onSelect: (userId: number | null) => void;
  onClose: () => void;
}

export default function AssigneeSelector({
  visible,
  members,
  selectedUserId,
  onSelect,
  onClose,
}: AssigneeSelectorProps) {
  const { colors } = useTheme();
  const s = getStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>Assignee</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.list}>
            <TouchableOpacity
              style={[s.item, !selectedUserId && s.itemActive]}
              onPress={() => {
                onSelect(null);
                onClose();
              }}
            >
              <View style={[s.avatar, { backgroundColor: colors.surfaceHover }]}>
                <Ionicons name="person-outline" size={14} color={colors.textSubtle} />
              </View>
              <Text style={[s.label, !selectedUserId && s.labelActive]}>Unassigned</Text>
            </TouchableOpacity>

            {members.map((member) => (
              <TouchableOpacity
                key={member.user_id}
                style={[s.item, selectedUserId === member.user_id && s.itemActive]}
                onPress={() => {
                  onSelect(member.user_id);
                  onClose();
                }}
              >
                <View style={[s.avatar, { backgroundColor: colors.primaryBg }]}>
                  <Text style={s.avatarText}>{member.username.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.userMeta}>
                  <Text style={[s.label, selectedUserId === member.user_id && s.labelActive]}>
                    {member.username}
                  </Text>
                  <Text style={s.email}>{member.email}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
      width: 280,
      backgroundColor: colors.surface,
      borderRadius: 12,
      maxHeight: 400,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 5,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 14,
      fontFamily: Fonts.bold,
      color: colors.text,
    },
    list: {
      padding: 8,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      borderRadius: 8,
      gap: 12,
    },
    itemActive: {
      backgroundColor: colors.surfaceHover,
    },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 12,
      fontFamily: Fonts.bold,
      color: colors.primary,
    },
    userMeta: {
      flex: 1,
    },
    label: {
      fontSize: 14,
      fontFamily: Fonts.medium,
      color: colors.text,
    },
    labelActive: {
      color: colors.primary,
      fontFamily: Fonts.bold,
    },
    email: {
      fontSize: 11,
      fontFamily: Fonts.regular,
      color: colors.textSubtle,
    },
  });
