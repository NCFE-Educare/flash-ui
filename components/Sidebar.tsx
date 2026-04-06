import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { sessionsApi, Session } from '../services/api';

const NAV_ITEMS = [
    { icon: 'grid-outline', label: 'Integration' },
    { icon: 'alarm-outline', label: 'Reminders' },
    { icon: 'bulb-outline', label: 'Memories' },
    { icon: 'videocam-outline', label: 'Video Agent' },
];

interface SidebarProps {
    selectedNav: number;
    onNavChange(i: number): void;
    onClose?(): void;
    compact?: boolean;
    sessions: Session[];
    activeSessionId: number | null;
    onSelectSession(id: number | null): void;
    onRefreshSessions(): void;
}

export default function Sidebar({
    selectedNav, onNavChange, onClose, compact = false,
    sessions, activeSessionId, onSelectSession, onRefreshSessions
}: SidebarProps) {

    const { user, token, logout } = useAuth();
    const { colors, isDark, mode, setMode } = useTheme();
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleDelete = async (id: number) => {
        if (!token) return;
        try {
            setDeletingId(id);
            await sessionsApi.delete(token, id);
            if (activeSessionId === id) {
                onSelectSession(null);
            }
            onRefreshSessions();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const toggleTheme = () => {
        if (mode === 'light') setMode('dark');
        else if (mode === 'dark') setMode('system');
        else setMode('light');
    };

    const themeIcon = mode === 'light' ? 'sunny-outline' : mode === 'dark' ? 'moon-outline' : 'desktop-outline';

    const s = getStyles(colors);

    return (
        <View style={[s.root, compact && s.rootCompact]}>
            {/* Header */}
            <View style={s.header}>
                <View style={s.logoRow}>
                    <Image source={require('../assets/logo.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                    {!compact && <Text style={s.logoText}>Cortex</Text>}
                </View>
                <TouchableOpacity onPress={onClose} style={s.collapseBtn}>
                    <Ionicons name="grid-outline" size={16} color={colors.textSubtle} />
                </TouchableOpacity>
            </View>

            {/* New Chat */}
            <TouchableOpacity
                style={[s.newChatBtn, compact && s.newChatBtnCompact]}
                activeOpacity={0.85}
                onPress={() => onSelectSession(null)}
            >
                <Ionicons name="add" size={16} color={colors.textInverse} />
                {!compact && <Text style={s.newChatText}>New chat</Text>}
            </TouchableOpacity>

            {/* Search (hidden in compact/tablet) */}
            {!compact && (
                <View style={s.searchBox}>
                    <Ionicons name="search-outline" size={14} color={colors.textMuted} />
                    <TextInput
                        style={s.searchInput as any}
                        placeholder="Search"
                        placeholderTextColor={colors.textMuted}
                    />
                </View>
            )}

            {/* Nav items */}
            {NAV_ITEMS.map((item, i) => (
                <TouchableOpacity
                    key={item.label}
                    style={[s.navItem, selectedNav === i && s.navItemActive, compact && s.navItemCompact]}
                    onPress={() => onNavChange(i)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={item.icon as any}
                        size={17}
                        color={selectedNav === i ? colors.text : colors.textMuted}
                    />
                    {!compact && (
                        <Text style={[s.navLabel, selectedNav === i && s.navLabelActive]}>
                            {item.label}
                        </Text>
                    )}
                </TouchableOpacity>
            ))}

            <View style={s.divider} />

            {/* History (hidden in compact mode) */}
            {!compact && (
                <ScrollView style={s.historyScroll} showsVerticalScrollIndicator={false}>
                    <Text style={s.historyCategory}>Recent Sessions</Text>
                    {sessions.map(sessionItem => {
                        const isActive = activeSessionId === sessionItem.id;
                        const isDeleting = deletingId === sessionItem.id;
                        return (
                            <TouchableOpacity
                                key={sessionItem.id}
                                style={[s.historyItem, isActive && s.historyItemActive, isDeleting && { opacity: 0.5 }]}
                                onPress={() => onSelectSession(sessionItem.id)}
                            >
                                <Text style={[s.historyText, isActive && s.historyTextActive]} numberOfLines={1}>
                                    {sessionItem.title}
                                </Text>
                                {isActive && (
                                    <TouchableOpacity onPress={() => handleDelete(sessionItem.id)} style={{ padding: 4 }}>
                                        <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                    {sessions.length === 0 && (
                        <Text style={[s.historyText, { color: colors.textSubtle, paddingHorizontal: 10, marginTop: 10 }]}>No saved chats yet.</Text>
                    )}
                </ScrollView>
            )}

            {/* User profile */}
            <View style={[s.profile, compact && s.profileCompact]}>
                <View style={s.avatar}>
                    <Text style={s.avatarText}>{user?.username?.charAt(0).toUpperCase() || '?'}</Text>
                </View>
                {!compact && (
                    <View style={s.profileInfo}>
                        <Text style={s.profileName} numberOfLines={1}>{user?.username || 'User'}</Text>
                        <Text style={s.profileEmail} numberOfLines={1}>{user?.email || ''}</Text>
                    </View>
                )}
                <TouchableOpacity onPress={toggleTheme} style={{ padding: 8 }}>
                    <Ionicons name={themeIcon} size={16} color={colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={logout} style={{ padding: 8 }}>
                    <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    root: {
        width: 250,
        height: '100%',
        backgroundColor: colors.surfaceSecondary,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        flexDirection: 'column',
    },
    rootCompact: { width: 64 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logoBox: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: 16, fontFamily: Fonts.bold, color: colors.text },
    collapseBtn: { padding: 4 },
    newChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12, marginBottom: 10, height: 38, borderRadius: 9, backgroundColor: colors.text, justifyContent: 'center' },
    newChatBtnCompact: { marginHorizontal: 10 },
    newChatText: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textInverse },
    searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 10, height: 34, borderRadius: 8, backgroundColor: colors.inputBg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    searchInput: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, color: colors.text, marginLeft: 6, ...({ outlineWidth: 0 } as any) },
    navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 8, marginVertical: 1, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
    navItemActive: { backgroundColor: colors.surfaceHover },
    navItemCompact: { justifyContent: 'center', gap: 0, marginHorizontal: 6 },
    navLabel: { fontSize: 13, fontFamily: Fonts.regular, color: colors.textMuted },
    navLabelActive: { fontFamily: Fonts.semibold, color: colors.text },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 12, marginVertical: 8 },
    historyScroll: { flex: 1 },
    historyCategory: { fontSize: 10, fontFamily: Fonts.semibold, color: colors.textSubtle, letterSpacing: 0.5, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 4, textTransform: 'uppercase' },
    historyItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, marginHorizontal: 6, borderRadius: 8 },
    historyItemActive: { backgroundColor: colors.primaryBg },
    historyText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, color: colors.textMuted },
    historyTextActive: { fontFamily: Fonts.medium, color: colors.primary },
    profile: { flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
    profileCompact: { justifyContent: 'center', gap: 0, flexDirection: 'column', paddingVertical: 14 },
    avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(124, 58, 237, 0.15)', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 13, fontFamily: Fonts.semibold, color: colors.primaryDark },
    profileInfo: { flex: 1, marginLeft: 6 },
    profileName: { fontSize: 12, fontFamily: Fonts.semibold, color: colors.text },
    profileEmail: { fontSize: 11, fontFamily: Fonts.regular, color: colors.textSubtle },
});
