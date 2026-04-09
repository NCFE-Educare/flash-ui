import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AppWindow } from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { Fonts } from "../constants/theme";

export default function AppsPage() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceHover }]}>
        <AppWindow size={48} color={colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>Apps System</Text>
      <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
        A new way to interact with your favorite tools is coming soon.
      </Text>
      
      <View style={[styles.badge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
        <Text style={[styles.badgeText, { color: colors.primary }]}>COMING SOON</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
    marginBottom: 32,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
  }
});
