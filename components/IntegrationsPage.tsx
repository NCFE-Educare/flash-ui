import React, { useState, useMemo, useEffect } from "react";
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
  TextInput,
  useWindowDimensions,
  Platform,
  Switch
} from "react-native";
import { Search, Settings, MoreHorizontal, Plus } from "lucide-react-native";
import { Fonts } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { integrationsApi } from "../services/api";

const CATEGORIES = [
  "All",
  "Google Workspace",
  "Communication",
  "Cloud Storage",
  "Academics",
  "Productivity"
];

const INTEGRATIONS_DATA = [
  {
    key: "gmail",
    label: "Gmail",
    description: "Sync your emails and draft responses with AI assistance.",
    icon: "https://img.icons8.com/color/48/gmail-new.png",
    category: "Communication",
    statusKey: "gmailConnected",
    connect: integrationsApi?.gmailConnect,
    disconnect: integrationsApi?.gmailDisconnect,
    status: integrationsApi?.gmailStatus,
  },
  {
    key: "calendar",
    label: "Google Calendar",
    description: "Auto-sync meetings & set reminders.",
    icon: "https://img.icons8.com/color/48/google-calendar--v2.png",
    category: "Google Workspace",
    statusKey: "calendarConnected",
    connect: integrationsApi?.calendarConnect,
    disconnect: integrationsApi?.calendarDisconnect,
    status: integrationsApi?.calendarStatus,
  },
  {
    key: "drive",
    label: "Google Drive",
    description: "Save meeting notes and attachments securely.",
    icon: "https://img.icons8.com/color/48/google-drive--v1.png",
    category: "Cloud Storage",
    statusKey: "driveConnected",
    connect: integrationsApi?.driveConnect,
    disconnect: integrationsApi?.driveDisconnect,
    status: integrationsApi?.driveStatus,
  },
  {
    key: "meet",
    label: "Google Meet",
    description: "Sync meeting notes with AI-generated highlights.",
    icon: "https://img.icons8.com/color/48/google-meet--v1.png",
    category: "Communication",
    statusKey: "meetConnected",
    connect: integrationsApi?.meetConnect,
    disconnect: integrationsApi?.meetDisconnect,
    status: integrationsApi?.meetStatus,
  },
  {
    key: "sheets",
    label: "Google Sheets",
    description: "Export data and update spreadsheets automatically.",
    icon: "https://img.icons8.com/color/48/google-sheets.png",
    category: "Productivity",
    statusKey: "sheetsConnected",
    connect: integrationsApi?.sheetsConnect,
    disconnect: integrationsApi?.sheetsDisconnect,
    status: integrationsApi?.sheetsStatus,
  },
  {
    key: "docs",
    label: "Google Docs",
    description: "Create and edit documents collaboratively.",
    icon: "https://img.icons8.com/color/48/google-docs.png",
    category: "Productivity",
    statusKey: "docsConnected",
    connect: integrationsApi?.docsConnect,
    disconnect: integrationsApi?.docsDisconnect,
    status: integrationsApi?.docsStatus,
  },
  {
    key: "slides",
    label: "Google Slides",
    description: "Generate and manage presentation slides.",
    icon: "https://img.icons8.com/color/48/google-slides.png",
    category: "Productivity",
    statusKey: "slidesConnected",
    connect: integrationsApi?.slidesConnect,
    disconnect: integrationsApi?.slidesDisconnect,
    status: integrationsApi?.slidesStatus,
  },
  {
    key: "forms",
    label: "Google Forms",
    description: "Analyze form responses and automate follow-ups.",
    icon: "https://img.icons8.com/color/48/google-forms.png",
    category: "Productivity",
    statusKey: "formsConnected",
    connect: integrationsApi?.formsConnect,
    disconnect: integrationsApi?.formsDisconnect,
    status: integrationsApi?.formsStatus,
  },
  {
    key: "classroom",
    label: "Google Classroom",
    description: "Manage classes and students with AI integration.",
    icon: "https://img.icons8.com/color/48/google-classroom.png",
    category: "Academics",
    statusKey: "classroomConnected",
    connect: integrationsApi?.classroomConnect,
    disconnect: integrationsApi?.classroomDisconnect,
    status: integrationsApi?.classroomStatus,
  }
];

export default function IntegrationsPage() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const checkIntegrations = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const results: Record<string, boolean> = {};
      for (const int of INTEGRATIONS_DATA) {
        if (int.status) {
            try {
              results[int.key] = await int.status(token);
            } catch {
              results[int.key] = false;
            }
        } else {
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

  const filteredIntegrations = useMemo(() => {
    return INTEGRATIONS_DATA.filter((item) => {
      const matchesSearch = item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All" || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const handleToggle = async (int: any) => {
    if (!token || !int.connect) return;
    
    const isConnected = status[int.key];
    if (isConnected) {
      try {
        await int.disconnect(token);
        setStatus((prev) => ({ ...prev, [int.key]: false }));
      } catch (e: any) {
        Alert.alert("Error disconnecting", e.message);
      }
    } else {
      try {
        const res = await int.connect(token);
        const url = res?.url || (res as any)?.auth_url || (typeof res === "string" ? res : null);
        if (url) {
          Linking.openURL(url);
          // Optimistically show active if no errors
          setStatus((prev) => ({ ...prev, [int.key]: true }));
        } else {
          Alert.alert("Error", "Invalid connection URL.");
        }
      } catch (e: any) {
        Alert.alert("Error connecting", e.message);
      }
    }
  };

  const isMobile = width < 768;
  const cardWidth = isMobile ? '100%' : width < 1200 ? '48%' : '31%';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header Section */}
      <View style={[styles.header, isMobile && styles.mobileHeader]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Integrations</Text>
          <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
            Connect your Google services to use them with Cortex
          </Text>
        </View>
        <View style={[styles.headerRight, isMobile && styles.mobileHeaderRight]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}>
            <Search size={18} color={colors.textSubtle} />
            <TextInput
              placeholder="Search integrations..."
              placeholderTextColor={colors.textSubtle}
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.addButtonText}>Add custom</Text>
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.tab,
                activeCategory === cat && { borderBottomColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.tabText, 
                { color: activeCategory === cat ? colors.text : colors.textMuted },
                activeCategory === cat && { fontFamily: Fonts.semibold }
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grid of Cards */}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.grid}>
          {filteredIntegrations.map((int) => (
            <View key={int.key} style={[styles.card, { width: cardWidth, backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Image source={{ uri: int.icon }} style={styles.appIcon} />
                <TouchableOpacity style={styles.moreButton}>
                  <MoreHorizontal size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{int.label}</Text>
                <Text style={[styles.cardDescription, { color: colors.textSubtle }]} numberOfLines={2}>
                  {int.description}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                 <TouchableOpacity style={[styles.detailsButton, { backgroundColor: colors.surfaceHover }]}>
                    <Settings size={14} color={colors.text} />
                    <Text style={[styles.detailsText, { color: colors.text }]}>Details</Text>
                 </TouchableOpacity>
                 <Switch
                   value={status[int.key] || false}
                   onValueChange={() => handleToggle(int)}
                   trackColor={{ false: colors.border, true: colors.primary }}
                   thumbColor="#fff"
                   ios_backgroundColor={colors.border}
                 />
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    gap: 20,
  },
  mobileHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    maxWidth: 500,
    lineHeight: 22,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileHeaderRight: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    minWidth: 200,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: Fonts.regular,
    paddingVertical: 0,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: 32,
  },
  tabsScroll: {
    gap: 32,
    paddingBottom: 0,
  },
  tab: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  loading: {
    padding: 40,
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    minHeight: 180,
    justifyContent: 'space-between',
    ...Platform.select({
      web: {
        transition: 'transform 0.2s ease-in-out',
        cursor: 'pointer',
      }
    })
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  moreButton: {
    padding: 4,
  },
  cardBody: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  detailsText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
  }
});
