import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "../../constants/theme";
import { useTheme } from "../../context/ThemeContext";

interface SimpleSelectorProps {
  visible: boolean;
  title: string;
  options: { label: string; value: string | number; icon?: string; color?: string }[];
  selectedValue: string | number | undefined;
  onSelect: (value: any) => void;
  onClose: () => void;
}

export default function SimpleSelector({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: SimpleSelectorProps) {
  const { colors } = useTheme();
  const s = getStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={s.list}>
            {options.map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={[s.item, selectedValue === opt.value && s.itemActive]}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                {opt.icon && (
                  <Ionicons name={opt.icon as any} size={16} color={opt.color || colors.text} />
                )}
                <Text style={[s.label, selectedValue === opt.value && s.labelActive]}>
                  {opt.label}
                </Text>
                {selectedValue === opt.value && (
                  <Ionicons name="checkmark" size={16} color={colors.primary} style={{marginLeft: 'auto'}} />
                )}
              </TouchableOpacity>
            ))}
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
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
    container: {
      width: 250,
      backgroundColor: colors.surface,
      borderRadius: 12,
      maxHeight: 400,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 13, fontFamily: Fonts.bold, color: colors.textSubtle, textTransform: 'uppercase' },
    list: { padding: 8 },
    item: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 8,
      gap: 12,
    },
    itemActive: { backgroundColor: colors.surfaceHover },
    label: { fontSize: 14, fontFamily: Fonts.medium, color: colors.text },
    labelActive: { color: colors.primary, fontFamily: Fonts.bold },
  });
