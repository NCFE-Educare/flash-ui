import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter, 
  SidebarGroup,
  SidebarTrigger,
  useSidebar 
} from "./ui/sidebar";
import { 
  LayoutGrid, 
  AlarmClock, 
  Lightbulb, 
  Video, 
  ListTodo,
  AppWindow,
  Plus, 
  Search,
  Trash2,
  LogOut,
  Moon,
  Sun,
  Monitor
} from "lucide-react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Fonts } from "../constants/theme";
import { Session } from "../services/api";

const NAV_ITEMS = [
  { icon: LayoutGrid, label: "Integration" },
  { icon: AlarmClock, label: "Reminders" },
  { icon: Lightbulb, label: "Memories" },
  { icon: Video, label: "Video Agent" },
  { icon: ListTodo, label: "Tasks" },
  { icon: AppWindow, label: "Apps" },
];

interface AppSidebarProps {
  selectedNav: number;
  onNavChange: (index: number) => void;
  sessions: Session[];
  activeSessionId: number | null;
  onSelectSession: (id: number | null) => void;
}

export function AppSidebar({
  selectedNav,
  onNavChange,
  sessions,
  activeSessionId,
  onSelectSession
}: AppSidebarProps) {
  const { colors, mode, setMode } = useTheme();
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const ThemeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;

  return (
    <Sidebar>
      <SidebarHeader>
        <View style={styles.headerRow}>
          <Image source={require('../assets/logo.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
          {!isCollapsed && <Text style={[styles.logoText, { color: colors.text }]}>Cortex</Text>}
        </View>
        {!isCollapsed && <SidebarTrigger />}
      </SidebarHeader>

      <SidebarContent>
        {/* New Chat Button */}
        <TouchableOpacity 
          style={[styles.newChatBtn, { backgroundColor: colors.text }]}
          onPress={() => onSelectSession(null)}
        >
          <Plus size={14} color={colors.textInverse} />
          {!isCollapsed && <Text style={[styles.newChatText, { color: colors.textInverse }]}>New chat</Text>}
        </TouchableOpacity>

        <SidebarGroup>
          {NAV_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.navItem,
                selectedNav === index && { backgroundColor: colors.surfaceHover }
              ]}
              onPress={() => onNavChange(index)}
            >
              <item.icon 
                size={18} 
                color={selectedNav === index ? colors.text : colors.textMuted} 
                strokeWidth={selectedNav === index ? 2.5 : 2}
              />
              {!isCollapsed && (
                <Text style={[
                  styles.navLabel, 
                  { color: selectedNav === index ? colors.text : colors.textMuted },
                  selectedNav === index && { fontFamily: Fonts.semibold }
                ]}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </SidebarGroup>

        {!isCollapsed && (
          <SidebarGroup>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionTitle, { color: colors.textSubtle }]}>Recent Sessions</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {sessions.map(session => (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    styles.historyItem,
                    activeSessionId === session.id && { backgroundColor: colors.primaryBg }
                  ]}
                  onPress={() => onSelectSession(session.id)}
                >
                  <Text 
                    style={[
                      styles.historyText, 
                      { color: colors.textMuted },
                      activeSessionId === session.id && { color: colors.primary, fontFamily: Fonts.medium }
                    ]} 
                    numberOfLines={1}
                  >
                    {session.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <View style={[styles.profileRow, isCollapsed && { justifyContent: 'center', paddingHorizontal: 0 }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          {!isCollapsed && (
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>{user?.username || 'User'}</Text>
              <Text style={[styles.profileEmail, { color: colors.textSubtle }]} numberOfLines={1}>{user?.email}</Text>
            </View>
          )}
          {!isCollapsed && (
            <TouchableOpacity onPress={logout}>
              <LogOut size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </SidebarFooter>
    </Sidebar>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  newChatText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  divider: {
    height: 1,
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 8,
    opacity: 0.6,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  historyItem: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 1,
  },
  historyText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
  },
  profileName: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
  },
  profileEmail: {
    fontSize: 10,
    fontFamily: Fonts.regular,
  }
});
