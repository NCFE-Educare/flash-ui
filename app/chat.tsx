import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Fonts } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { sessionsApi, chatApi, Session, ChatMessage } from '../services/api';
import Sidebar from '../components/Sidebar';
import ChatTopBar from '../components/ChatTopBar';
import ChatWelcome from '../components/ChatWelcome';
import ChatInputArea from '../components/ChatInputArea';

export default function ChatScreen() {
    const r = useResponsive();
    const { token, user } = useAuth();
    const { colors, isDark } = useTheme();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedNav, setSelectedNav] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // ── Backend State ──
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    // ── Fetching ──
    const loadSessions = useCallback(async () => {
        if (!token) return;
        try {
            setLoadingSessions(true);
            const data = await sessionsApi.list(token);
            setSessions(data);
        } catch (err: any) {
            console.error('Failed to load sessions', err.message);
        } finally {
            setLoadingSessions(false);
        }
    }, [token]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    const selectSession = async (id: number | null) => {
        setActiveSessionId(id);
        if (!id || !token) {
            setMessages([]);
            return;
        }

        try {
            setLoadingMessages(true);
            const detail = await sessionsApi.get(token, id);
            setMessages(detail.messages);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
        } catch (err: any) {
            Alert.alert('Error', 'Failed to load chat history. ' + err.message);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    // ── Sending Message ──
    const sendMessage = async (text: string, imageUrls?: string[]) => {
        if (!token) return;

        // Optimistic UI update
        const tempId = Date.now();
        const newUserMsg: ChatMessage = {
            id: tempId,
            role: 'user',
            content: text,
            image_url: imageUrls && imageUrls.length > 0 ? JSON.stringify(imageUrls) : undefined,
            created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, newUserMsg]);
        setIsTyping(true);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            const res = await chatApi.send(token, text, activeSessionId, imageUrls);

            const aiMsg: ChatMessage = {
                id: tempId + 1,
                role: 'assistant',
                content: res.reply,
                created_at: new Date().toISOString(),
            };

            setMessages(prev => [...prev, aiMsg]);

            // If this was a new session (activeSessionId was null), we now have a session_id
            if (!activeSessionId) {
                setActiveSessionId(res.session_id);
                await loadSessions(); // refresh the sidebar
            }

            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to send message');
            // Remove the optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
            setIsTyping(false);
        }
    };

    // ── Layout helpers ──
    const showPersistentSidebar = r.isDesktop && !sidebarCollapsed;
    const sidebarWidth = r.isTablet ? 200 : 250;
    const chatPadH = r.isDesktop ? 120 : r.isTablet ? 40 : 0;

    const layout = getLayoutStyles(colors);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={layout.root}>

                    {/* ── Persistent sidebar (desktop) ───────────────────────── */}
                    {showPersistentSidebar && (
                        <View style={{ width: sidebarWidth }}>
                            <Sidebar
                                selectedNav={selectedNav}
                                onNavChange={setSelectedNav}
                                onClose={() => setSidebarCollapsed(true)}
                                compact={r.isTablet}
                                sessions={sessions}
                                activeSessionId={activeSessionId}
                                onSelectSession={selectSession}
                                onRefreshSessions={loadSessions}
                            />
                        </View>
                    )}

                    {/* ── Main content ────────────────────────────────────────── */}
                    <View style={layout.main}>
                        {/* Top bar */}
                        {r.isDesktop ? (
                            <ChatTopBar
                                sidebarCollapsed={sidebarCollapsed}
                                onToggleSidebar={() => setSidebarCollapsed(false)}
                            />
                        ) : (
                            <MobileTopBar onOpenDrawer={() => setDrawerOpen(true)} colors={colors} />
                        )}

                        {/* Chat body */}
                        {loadingMessages ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : messages.length === 0 ? (
                            <ChatWelcome onSuggestion={sendMessage} />
                        ) : (
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                keyExtractor={m => String(m.id)}
                                contentContainerStyle={{ paddingHorizontal: chatPadH, paddingVertical: 24, paddingBottom: 40 }}
                                renderItem={({ item }) => (
                                    <MessageBubble
                                        msg={item}
                                        isDesktop={r.isDesktop}
                                        username={user?.username || 'U'}
                                        colors={colors}
                                    />
                                )}
                                ListFooterComponent={isTyping ? (
                                    <MessageBubble
                                        msg={{ id: 0, role: 'assistant', content: '...', created_at: '' }}
                                        isDesktop={r.isDesktop}
                                        username={user?.username || 'U'}
                                        colors={colors}
                                        isTyping
                                    />
                                ) : null}
                            />
                        )}

                        {/* Input */}
                        <ChatInputArea onSend={sendMessage} />
                    </View>

                    {/* ── Mobile/tablet drawer overlay ────────────────────────── */}
                    {!r.isDesktop && drawerOpen && (
                        <View style={layout.drawerOverlay}>
                            <TouchableOpacity
                                style={StyleSheet.absoluteFillObject}
                                onPress={() => setDrawerOpen(false)}
                            />
                            <View style={{ width: sidebarWidth }}>
                                <Sidebar
                                    selectedNav={selectedNav}
                                    onNavChange={i => { setSelectedNav(i); setDrawerOpen(false); }}
                                    onClose={() => setDrawerOpen(false)}
                                    compact={r.isTablet}
                                    sessions={sessions}
                                    activeSessionId={activeSessionId}
                                    onSelectSession={id => { selectSession(id); setDrawerOpen(false); }}
                                    onRefreshSessions={loadSessions}
                                />
                            </View>
                        </View>
                    )}

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ── Mobile / Tablet top bar ────────────────────────────────────────────────
function MobileTopBar({ onOpenDrawer, colors }: { onOpenDrawer(): void, colors: any }) {
    const styles = getLayoutStyles(colors);
    return (
        <View style={styles.mobileTopBar}>
            <TouchableOpacity onPress={onOpenDrawer} style={{ padding: 6 }}>
                <Ionicons name="menu-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.mobileLogoRow}>
                <LinearGradient colors={[colors.primaryDark, colors.primaryLight]} style={styles.mobileLogoBox}>
                    <Ionicons name="sparkles" size={12} color="#fff" />
                </LinearGradient>
                <Text style={styles.mobileLogoText}>Cortex</Text>
            </View>
            <TouchableOpacity style={styles.mobileUpgradeBtn}>
                <Text style={styles.mobileUpgradeText}>Upgrade</Text>
            </TouchableOpacity>
        </View>
    );
}

// ── Message Bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg, isDesktop, username, colors, isTyping }: { msg: ChatMessage; isDesktop: boolean; username: string, colors: any, isTyping?: boolean }) {
    const isUser = msg.role === 'user';
    const b = getBubbleStyles(colors);

    let parsedImageUrls: string[] = [];
    if (msg.image_url) {
        try {
            parsedImageUrls = JSON.parse(msg.image_url);
        } catch (e) {
            parsedImageUrls = [msg.image_url];
        }
    }

    return (
        <View style={[
            b.row,
            isUser ? b.rowUser : b.rowAI,
            { marginBottom: 24 },
        ]}>
            {!isUser && (
                <LinearGradient colors={[colors.primary, colors.primaryLight]} style={b.aiAvatar}>
                    <Ionicons name="sparkles" size={13} color="#fff" />
                </LinearGradient>
            )}
            <View style={[
                b.bubble,
                isUser ? b.userBubble : b.aiBubble,
                { maxWidth: isDesktop ? '60%' : '85%' },
                isTyping ? { minWidth: 60, alignItems: 'center' } : undefined,
                parsedImageUrls.length > 0 ? { paddingHorizontal: 8, paddingVertical: 8 } : undefined
            ]}>
                {isTyping ? (
                    <ActivityIndicator size="small" color={colors.text} />
                ) : (
                    <>
                        {parsedImageUrls.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: msg.content ? 8 : 0 }}>
                                {parsedImageUrls.map((url, i) => (
                                    <Image
                                        key={i}
                                        source={{ uri: url.startsWith('http') || url.startsWith('blob:') || url.startsWith('file:') || url.startsWith('data:') ? url : `http://127.0.0.1:8000${url}` }}
                                        style={{ width: 200, height: 200, borderRadius: 8 }}
                                        resizeMode="cover"
                                    />
                                ))}
                            </View>
                        )}
                        {!!msg.content && <Text style={[b.text, isUser && b.userText]}>{msg.content}</Text>}
                    </>
                )}
            </View>
            {isUser && (
                <View style={b.userAvatar}>
                    <Text style={b.userAvatarText}>{username.charAt(0).toUpperCase()}</Text>
                </View>
            )}
        </View>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const getLayoutStyles = (colors: any) => StyleSheet.create({
    root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
    main: { flex: 1, flexDirection: 'column' },
    drawerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.6)' },
    mobileTopBar: { height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    mobileLogoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    mobileLogoBox: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    mobileLogoText: { fontSize: 16, fontFamily: Fonts.bold, color: colors.text },
    mobileUpgradeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 7, backgroundColor: colors.text },
    mobileUpgradeText: { fontSize: 12, fontFamily: Fonts.semibold, color: colors.background },
});

const getBubbleStyles = (colors: any) => StyleSheet.create({
    row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    rowUser: { justifyContent: 'flex-end' },
    rowAI: { justifyContent: 'flex-start' },
    aiAvatar: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    userAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceHover, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    userAvatarText: { fontSize: 13, fontFamily: Fonts.semibold, color: colors.text },
    bubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
    userBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    aiBubble: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
    text: { fontSize: 15, fontFamily: Fonts.regular, color: colors.text, lineHeight: 24 },
    userText: { color: '#fff' },
});
