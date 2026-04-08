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
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
    LayoutGrid, 
    AlarmClock, 
    Lightbulb, 
    Video, 
    ListTodo, 
    Plus, 
    Search, 
    Trash2, 
    Moon, 
    Sun, 
    Monitor, 
    LogOut,
} from 'lucide-react-native';
import { Fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import { sessionsApi, Session } from '../services/api';
import SidebarTrigger from './SidebarTrigger';

const NAV_ITEMS = [
    { icon: LayoutGrid, label: 'Integration' },
    { icon: AlarmClock, label: 'Reminders' },
    { icon: Lightbulb, label: 'Memories' },
    { icon: Video, label: 'Video Agent' },
    { icon: ListTodo, label: 'Tasks' },
];

interface SidebarProps {
    selectedNav: number;
    onNavChange(i: number): void;
    onClose?(): void;
    sessions: Session[];
    activeSessionId: number | null;
    onSelectSession(id: number | null): void;
    onRefreshSessions(): void;
}

export default function Sidebar({
    selectedNav, onNavChange, onClose,
    sessions, activeSessionId, onSelectSession, onRefreshSessions
}: SidebarProps) {

    const { user, token, logout } = useAuth();
    const { colors, mode, setMode } = useTheme();
    const { isCollapsed, sidebarWidth, toggleSidebar } = useSidebar();
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

    const ThemeIcon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;

    const s = getStyles(colors, isCollapsed, sidebarWidth);

    return (
        <View style={s.root}>
            {/* Header */}
            <View style={s.header}>
                {isCollapsed ? (
                    <TouchableOpacity onPress={toggleSidebar} style={s.logoBtnCollapsed} activeOpacity={0.7}>
                         <Image source={require('../assets/logo.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                    </TouchableOpacity>
                ) : (
                    <>
                        <View style={s.logoRow}>
                            <Image source={require('../assets/logo.png')} style={{ width: 22, height: 22 }} resizeMode="contain" />
                            <Text style={s.logoText}>Cortex</Text>
                        </View>
                        <SidebarTrigger />
                    </>
                )}
            </View>

            {/* New Chat */}
            <TouchableOpacity
                style={s.newChatBtn}
                activeOpacity={0.85}
                onPress={() => onSelectSession(null)}
            >
                <Plus size={16} color={colors.textInverse} />
                {!isCollapsed && <Text style={s.newChatText}>New chat</Text>}
            </TouchableOpacity>

            {/* Search (hidden in collapsed/tablet) */}
            {!isCollapsed && (
                <View style={s.searchBox}>
                    <Search size={14} color={colors.textMuted} />
                    <TextInput
                        style={s.searchInput as any}
                        placeholder="Search"
                        placeholderTextColor={colors.textMuted}
                    />
                </View>
            )}

            {/* Nav items */}
            <View style={s.navContainer}>
                {NAV_ITEMS.map(({ icon: Icon, label }, i) => (
                    <TouchableOpacity
                        key={label}
                        style={[s.navItem, selectedNav === i && s.navItemActive]}
                        onPress={() => onNavChange(i)}
                        activeOpacity={0.7}
                    >
                        <Icon
                            size={18}
                            color={selectedNav === i ? colors.text : colors.textMuted}
                            strokeWidth={selectedNav === i ? 2.5 : 2}
                        />
                        {!isCollapsed && (
                            <Text style={[s.navLabel, selectedNav === i && s.navLabelActive]}>
                                {label}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <View style={s.divider} />

            {/* History (hidden in collapsed mode) */}
            {!isCollapsed && (
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
                                        <Trash2 size={14} color={colors.textMuted} />
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
            <View style={[s.profile, isCollapsed && s.profileCollapsed]}>
                <View style={[s.avatar, isCollapsed && { marginRight: 0 }]}>
                    <Text style={s.avatarText}>{user?.username?.charAt(0).toUpperCase() || '?'}</Text>
                </View>
                {!isCollapsed && (
                    <View style={s.profileInfo}>
                        <Text style={s.profileName} numberOfLines={1}>{user?.username || 'User'}</Text>
                        <Text style={s.profileEmail} numberOfLines={1}>{user?.email || ''}</Text>
                    </View>
                )}
                
                {isCollapsed ? (
                    <View style={s.actionStackCollapsed}>
                         <TouchableOpacity onPress={toggleTheme} style={s.actionBtnCollapsed}>
                            <ThemeIcon size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={logout} style={s.actionBtnCollapsed}>
                            <LogOut size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={s.actionRow}>
                        <TouchableOpacity onPress={toggleTheme} style={{ padding: 6 }}>
                            <ThemeIcon size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={logout} style={{ padding: 6 }}>
                            <LogOut size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

const getStyles = (colors: any, isCollapsed: boolean, sidebarWidth: number) => StyleSheet.create({
    root: {
        width: sidebarWidth,
        height: '100%',
        backgroundColor: colors.surfaceSecondary,
        borderRightWidth: 1,
        borderRightColor: colors.border,
        flexDirection: 'column',
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'space-between', 
        paddingHorizontal: isCollapsed ? 0 : 12, 
        paddingVertical: 14 
    },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logoText: { fontSize: 16, fontFamily: Fonts.bold, color: colors.text, letterSpacing: -0.5 },
    logoBtnCollapsed: { padding: 4 },
    newChatBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        marginHorizontal: isCollapsed ? 6 : 12, 
        marginBottom: 14, 
        height: 36, 
        borderRadius: 8, 
        backgroundColor: colors.text, 
        justifyContent: 'center',
    },
    newChatText: { fontSize: 13, fontFamily: Fonts.semibold, color: colors.textInverse },
    searchBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginHorizontal: 12, 
        marginBottom: 10, 
        paddingHorizontal: 10, 
        height: 32, 
        borderRadius: 8, 
        backgroundColor: colors.inputBg, 
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: colors.border 
    },
    searchInput: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, color: colors.text, marginLeft: 6, ...({ outlineWidth: 0 } as any) },
    navContainer: { paddingHorizontal: 6, gap: 2 },
    navItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: isCollapsed ? 0 : 10, 
        paddingHorizontal: isCollapsed ? 0 : 10, 
        paddingVertical: 7, 
        borderRadius: 8 
    },
    navItemActive: { backgroundColor: colors.surfaceHover },
    navLabel: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textMuted },
    navLabelActive: { color: colors.text, fontFamily: Fonts.semibold },
    divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 12, marginVertical: 10 },
    historyScroll: { flex: 1 },
    historyCategory: { fontSize: 10, fontFamily: Fonts.bold, color: colors.textSubtle, letterSpacing: 0.8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, textTransform: 'uppercase' },
    historyItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, marginHorizontal: 6, borderRadius: 8 },
    historyItemActive: { backgroundColor: colors.primaryBg },
    historyText: { flex: 1, fontSize: 13, fontFamily: Fonts.regular, color: colors.textMuted },
    historyTextActive: { fontFamily: Fonts.medium, color: colors.primary },
    profile: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 10, 
        borderTopWidth: 1, 
        borderTopColor: colors.border, 
        gap: 6 
    },
    profileCollapsed: { 
        flexDirection: 'column', 
        justifyContent: 'center', 
        paddingVertical: 14,
        paddingHorizontal: 0,
        gap: 10
    },
    avatar: { 
        width: 28, 
        height: 28, 
        borderRadius: 7, 
        backgroundColor: colors.primary + '20', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginRight: 2
    },
    avatarText: { fontSize: 13, fontFamily: Fonts.bold, color: colors.primary },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 12, fontFamily: Fonts.semibold, color: colors.text },
    profileEmail: { fontSize: 10, fontFamily: Fonts.regular, color: colors.textSubtle },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    actionStackCollapsed: { gap: 6, alignItems: 'center' },
    actionBtnCollapsed: { padding: 4 }
});
