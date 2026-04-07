import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Fonts } from "../../constants/theme";

interface WorkspaceAnalyticsProps {
  workspaceId: number;
}

export default function WorkspaceAnalytics({ workspaceId }: WorkspaceAnalyticsProps) {
  return (
    <View style={s.center}>
      <Text style={s.msg}>Analytics are only available on the web version.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  msg: {
    fontSize: 14,
    color: "#94a3b8",
    fontFamily: Fonts.medium,
    textAlign: 'center',
  },
});
