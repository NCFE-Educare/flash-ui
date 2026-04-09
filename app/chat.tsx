import React, { useState, useEffect, useCallback, useRef } from "react";
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
    Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Fonts } from "../constants/theme";
import { useResponsive } from "../hooks/useResponsive";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "text-encoding-polyfill";
import { sessionsApi, chatApi, Session, ChatMessage, ToolEvent, ReasoningStep } from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import { AppSidebar } from "../components/app-sidebar";
import { useSidebar } from "../components/ui/sidebar";
import ChatTopBar from "../components/ChatTopBar";
import ChatWelcome from "../components/ChatWelcome";
import ChatInputArea from "../components/ChatInputArea";
import IntegrationsPage from "../components/IntegrationsPage";
import RemindersPage from "../components/RemindersPage";
import MemoriesPage from "../components/MemoriesPage";
import VideoChatAgentPage from "../components/VideoChatAgentPage";
import TasksPage from "../components/TasksPage";
import AppsPage from "../components/AppsPage";

import { TextGenerateEffect } from "../components/TextGenerateEffect";
import Markdown from "react-native-markdown-display";
import {
    ChainOfThought,
    ChainOfThoughtHeader,
    ChainOfThoughtStep,
    ChainOfThoughtSearchResults,
    ChainOfThoughtSearchResult,
    ChainOfThoughtImage
} from "../components/ChainOfThought";

const CHAT_VIEW = -1;
const INTEGRATIONS_VIEW = 0;
const REMINDERS_VIEW = 1;
const MEMORIES_VIEW = 2;
const VIDEO_CHAT_AGENT_VIEW = 3;
const TASKS_VIEW = 4;
const APPS_VIEW = 5;


// ── Thinking Cache (persists across refresh / session switches) ─────────────
const THINKING_CACHE_KEY = "cortex_thinking_cache";

function saveThinkingToCache(
    sessionId: number,
    content: string,
    thinking: string,
    toolEvents: ToolEvent[],
) {
    if (!thinking && toolEvents.length === 0) return;
    try {
        const raw = Platform.OS === "web" ? localStorage.getItem(THINKING_CACHE_KEY) : null;
        const cache: Record<string, { thinking: string; toolEvents: ToolEvent[] }> = raw ? JSON.parse(raw) : {};
        const key = `${sessionId}:${content.substring(0, 200)}`;
        cache[key] = { thinking, toolEvents };
        if (Platform.OS === "web") {
            localStorage.setItem(THINKING_CACHE_KEY, JSON.stringify(cache));
        }
    } catch { }
}

function hydrateThinkingFromCache(sessionId: number, msgs: ChatMessage[]): ChatMessage[] {
    try {
        const raw = Platform.OS === "web" ? localStorage.getItem(THINKING_CACHE_KEY) : null;
        if (!raw) return msgs;
        const cache: Record<string, { thinking: string; toolEvents: ToolEvent[] }> = JSON.parse(raw);
        return msgs.map((m) => {
            if (m.role !== "assistant" || !m.content) return m;
            const key = `${sessionId}:${m.content.substring(0, 200)}`;
            const cached = cache[key];
            if (cached) {
                return { ...m, thinking: cached.thinking, toolEvents: cached.toolEvents };
            }
            return m;
        });
    } catch {
        return msgs;
    }
}

export default function ChatScreen() {
    const r = useResponsive();
    const { token, user } = useAuth();
    const { colors, isDark } = useTheme();

    const { open, setOpen, toggleSidebar } = useSidebar();
    const [selectedNav, setSelectedNav] = useState(CHAT_VIEW);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // ── Backend State ──
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(null);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);



    const abortControllerRef = useRef<AbortController | null>(null);
    const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastStreamedSessionUpdate = useRef<number | null>(null);

    const flatListRef = useRef<FlatList>(null);

    // ── Fetching ──
    const loadSessions = useCallback(async () => {
        if (!token) return;
        try {
            setLoadingSessions(true);
            const data = await sessionsApi.list(token);
            setSessions(data);
        } catch (err: any) {
            console.error("Failed to load sessions", err.message);
        } finally {
            setLoadingSessions(false);
        }
    }, [token]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    // ── SSE response_done (handled by NotificationProvider) ──
    const { registerResponseDone, refreshPending, navigateToRemindersTrigger } = useNotifications();

    useEffect(() => {
        return registerResponseDone((finishedSessionId) => {
            loadSessions();
            if (finishedSessionId === activeSessionId && token) {
                // Skip reload if we just did it or are doing it via local stream
                if (lastStreamedSessionUpdate.current === finishedSessionId) {
                    console.log("Skipping redundant active session reload (just streamed)");
                    // Clear it after a short delay because multiple response_done can arrive
                    setTimeout(() => {
                        if (lastStreamedSessionUpdate.current === finishedSessionId) {
                            lastStreamedSessionUpdate.current = null;
                        }
                    }, 3000);
                    return;
                }
                sessionsApi.get(token, finishedSessionId)
                    .then((detail) => {
                        setMessages(hydrateThinkingFromCache(finishedSessionId, detail.messages));
                        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
                    })
                    .catch((e) => console.error("Failed to refresh active session via SSE", e));
            }
            refreshPending();
        });
    }, [registerResponseDone, loadSessions, activeSessionId, token, refreshPending]);

    // React to "navigate to reminders" trigger (from toast View all or header dropdown)
    useEffect(() => {
        if (navigateToRemindersTrigger > 0) {
            setSelectedNav(REMINDERS_VIEW);
        }
    }, [navigateToRemindersTrigger]);

    const selectSession = async (id: number | null) => {
        setSelectedNav(CHAT_VIEW);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsGenerating(false);
            setIsTyping(false);
        }

        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = null;
        }
        setStreamingMessage(null);
        setActiveSessionId(id);
        if (!id || !token) {
            setMessages([]);
            return;
        }

        try {
            setLoadingMessages(true);
            const detail = await sessionsApi.get(token, id);
            setMessages(hydrateThinkingFromCache(id, detail.messages));

            setTimeout(
                () => flatListRef.current?.scrollToEnd({ animated: true }),
                200,
            );
        } catch (err: any) {
            Alert.alert("Error", "Failed to load chat history. " + err.message);
            setMessages([]);
        } finally {
            setLoadingMessages(false);
        }
    };

    // ── SSE Parser (matches backend spec: line-by-line, blank-line boundary) ──
    const readSSE = async function* (stream: any) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let eventType = "";
        let dataStr = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            // Keep the last (potentially incomplete) line in the buffer for the next chunk.
            buffer = lines[lines.length - 1];
            for (let i = 0; i < lines.length - 1; i++) {
                const trimmed = lines[i].trim();
                if (trimmed.startsWith("event: ")) {
                    eventType = trimmed.slice(7);
                } else if (trimmed.startsWith("data: ")) {
                    const data = trimmed.slice(6);
                    if (data) {
                        try {
                            yield { type: eventType || "text", data: JSON.parse(data) };
                        } catch (e) {
                            // Ignore parse errors
                        }
                    }
                } else if (trimmed === "") {
                    eventType = "";
                }
            }
        }
    };

    // ── Sending Message ──
    const sendMessage = async (
        text: string,
        imageUrls?: string[],
        documentUrls?: string[],
    ) => {
        if (!token) return;

        const tempId = Date.now();
        const newUserMsg: ChatMessage = {
            id: tempId,
            role: "user",
            content: text,
            image_url:
                imageUrls && imageUrls.length > 0
                    ? JSON.stringify(imageUrls)
                    : undefined,
            document_urls: documentUrls,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, newUserMsg]);
        setIsTyping(true);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        const aiId = tempId + 1;

        const controller = new AbortController();
        abortControllerRef.current = controller;
        setIsGenerating(true);

        try {
            const res = await chatApi.sendStream(
                token,
                text,
                activeSessionId,
                imageUrls,
                documentUrls,
                controller.signal,
            );

            // Mark this session as being updated by our stream
            lastStreamedSessionUpdate.current = activeSessionId;

            if (!res.body) {
                throw new Error("Streaming not supported on this platform.");
            }

            const aiMsgBase: ChatMessage = {
                id: aiId,
                role: "assistant",
                content: "",
                created_at: new Date().toISOString(),
                isStreaming: true,
                isThinking: true,
                thinking: "",
                toolEvents: [],
            };
            setStreamingMessage(aiMsgBase);
            setIsTyping(false);

            let currentContent = "";
            let currentThinking = "";
            let currentTools: ToolEvent[] = [];
            let currentReasoningSteps: ReasoningStep[] = [];

            for await (const { type, data } of readSSE(res.body)) {
                switch (type) {
                    case "thinking_start":
                        currentThinking = "";
                        currentReasoningSteps.push({ type: 'thinking', content: '', status: 'active' });
                        setStreamingMessage({ ...aiMsgBase, thinking: "", isThinking: true, reasoning_steps: currentReasoningSteps });
                        break;
                    case "thinking":
                        currentThinking += data.content;
                        // Update or add the latest thinking step
                        if (currentReasoningSteps.length > 0 && currentReasoningSteps[currentReasoningSteps.length - 1].type === 'thinking') {
                            (currentReasoningSteps[currentReasoningSteps.length - 1] as any).content = currentThinking;
                        } else {
                            currentReasoningSteps.push({ type: 'thinking', content: currentThinking, status: 'active' });
                        }
                        setStreamingMessage({ ...aiMsgBase, thinking: currentThinking, isThinking: true, reasoning_steps: currentReasoningSteps });
                        break;
                    case "text":
                        currentContent += data.content;
                        // Mark last thinking step as complete if any
                        if (currentReasoningSteps.length > 0 && currentReasoningSteps[currentReasoningSteps.length - 1].type === 'thinking') {
                            currentReasoningSteps[currentReasoningSteps.length - 1].status = 'complete';
                        }
                        setStreamingMessage({
                            ...aiMsgBase,
                            content: currentContent,
                            thinking: currentThinking,
                            isThinking: false,
                            reasoning_steps: currentReasoningSteps
                        });
                        break;
                    case "tool_start":
                        // Mark last thinking step as complete if any
                        if (currentReasoningSteps.length > 0 && currentReasoningSteps[currentReasoningSteps.length - 1].type === 'thinking') {
                            currentReasoningSteps[currentReasoningSteps.length - 1].status = 'complete';
                        }
                        currentTools = [...currentTools, { tool: data.tool, status: "running" }];
                        currentReasoningSteps.push({ type: 'tool', tool: data.tool, status: 'running', input: data.input });

                        setStreamingMessage({
                            ...aiMsgBase,
                            content: currentContent,
                            thinking: currentThinking,
                            toolEvents: currentTools,
                            reasoning_steps: currentReasoningSteps
                        });
                        break;
                    case "tool_end":
                        currentTools = currentTools.map((t) =>
                            t.tool === data.tool ? { ...t, status: "done" } : t,
                        );
                        currentReasoningSteps = currentReasoningSteps.map((s) =>
                            s.type === 'tool' && s.tool === data.tool ? { ...s, status: 'done' } : s
                        );
                        setStreamingMessage({
                            ...aiMsgBase,
                            content: currentContent,
                            thinking: currentThinking,
                            toolEvents: currentTools,
                            reasoning_steps: currentReasoningSteps
                        });
                        break;
                    case "done":
                        const sid = activeSessionId || data.session_id;
                        lastStreamedSessionUpdate.current = sid;
                        if (sid) {
                            saveThinkingToCache(sid, data.reply, currentThinking, currentTools);
                        }

                        let dedupedThinking = currentThinking;
                        if (data.reply && currentThinking && data.reply.startsWith(currentThinking.substring(0, 100))) {
                            dedupedThinking = "";
                        }

                        const finalMsg: ChatMessage = {
                            ...aiMsgBase,
                            content: data.reply,
                            thinking: dedupedThinking || currentThinking,
                            toolEvents: currentTools,
                            reasoning_steps: currentReasoningSteps.map(s => {
                                if (s.type === 'thinking') {
                                    return { ...s, status: 'complete' as const };
                                } else {
                                    return { ...s, status: 'done' as const };
                                }
                            }),
                            isStreaming: false,
                            isThinking: false,
                        };

                        const animatingMsg: ChatMessage = { ...finalMsg, isStreaming: true };
                        setStreamingMessage(animatingMsg);

                        const remainingChars = Math.max(0, data.reply.length - currentContent.length);
                        const animDelay = Math.min(2200, remainingChars * 20 + 300);

                        if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
                        animationTimeoutRef.current = setTimeout(() => {
                            setMessages((prev) => [...prev, finalMsg]);
                            setStreamingMessage(null);
                            animationTimeoutRef.current = null;
                        }, animDelay);

                        if (!activeSessionId) {
                            setActiveSessionId(data.session_id);
                            await loadSessions();
                        }
                        break;
                }
            }
            setTimeout(
                () => flatListRef.current?.scrollToEnd({ animated: true }),
                100,
            );
        } catch (err: any) {
            if (err.name === "AbortError") {
                console.log("Stream aborted by user");
            } else {
                console.error("Chat error:", err);
                Alert.alert("Error", err.message || "Failed to send message");
                setMessages((prev) => prev.filter((m) => m.id !== tempId));
            }
        } finally {
            setIsTyping(false);
            setIsGenerating(false);
            abortControllerRef.current = null;
        }
    };


    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = null;
        }
        setStreamingMessage(null);
        setIsGenerating(false);
        setIsTyping(false);
    };

    const handleExportChat = async () => {
        if (Platform.OS !== "web") {
            Alert.alert("Export", "Exporting chat is currently only supported on web.");
            return;
        }

        if (!activeSessionId || !token) {
            Alert.alert("Export", "No active session to export.");
            return;
        }

        try {
            console.log("Fetching session from backend skipping cache...", activeSessionId);
            const detail = await sessionsApi.get(token, activeSessionId, true);
            console.log("Session fetched:", detail);

            // Robust message extraction
            let sessionMessages: ChatMessage[] = [];
            const responseData = detail as any;
            if (responseData.messages && Array.isArray(responseData.messages)) {
                sessionMessages = responseData.messages;
            } else if (responseData.detail && Array.isArray(responseData.detail)) {
                // Fallback for non-standard formats mentioned by the user
                sessionMessages = responseData.detail.map((m: any) => ({
                    ...m,
                    role: m.role || (m.type === 'string' ? 'assistant' : 'user'), // Fallback role
                    content: m.content || m.msg || (typeof m === 'string' ? m : ""),
                })).filter((m: any) => m.role && m.content);
            }

            if (sessionMessages.length === 0) {
                // Optional: show the raw response if it fails
                console.warn("No messages found in response:", detail);
                Alert.alert("Export", "No messages found in this session. The server returned: " + JSON.stringify(detail).substring(0, 100));
                return;
            }

            // Dynamically load the export service to avoid static rendering/bundling issues
            // @ts-ignore
            const { exportChatToPDF } = await import("../services/exportService");
            await exportChatToPDF(sessionMessages, user?.username || "USER");

        } catch (err: any) {
            console.error("Export error:", err);
            Alert.alert("Export Error", "Failed to generate PDF. " + err.message);
        }
    };

    // ── Layout helpers ──
    const showPersistentSidebar = r.isDesktop;
    const sidebarWidth = open ? (r.isTablet ? 200 : 220) : 52;
    const chatPadH = r.isDesktop ? 120 : r.isTablet ? 40 : 16;

    const layout = getLayoutStyles(colors);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
                <View style={layout.root}>
                    {/* ── Persistent sidebar (desktop) ───────────────────────── */}
                    {showPersistentSidebar && (
                        <AppSidebar
                            selectedNav={selectedNav}
                            onNavChange={setSelectedNav}
                            sessions={sessions}
                            activeSessionId={activeSessionId}
                            onSelectSession={selectSession}
                        />
                    )}

                    {/* ── Main content ────────────────────────────────────────── */}
                    <View style={layout.main}>
                        {/* Top bar (always visible on Chat, Integrations, Reminders) */}
                        {r.isDesktop ? (
                            <ChatTopBar
                                sidebarCollapsed={!open}
                                onToggleSidebar={() => setOpen(true)}
                                onViewReminders={() => setSelectedNav(REMINDERS_VIEW)}
                                onExportChat={handleExportChat}
                            />
                        ) : (
                            <MobileTopBar
                                onViewReminders={() => setSelectedNav(REMINDERS_VIEW)}
                                colors={colors}
                            />
                        )}

                        <View style={{ flex: 1 }}>
                            {selectedNav === INTEGRATIONS_VIEW ? (
                                <IntegrationsPage />
                            ) : selectedNav === REMINDERS_VIEW ? (
                                <RemindersPage />
                            ) : selectedNav === MEMORIES_VIEW ? (
                                <MemoriesPage />
                            ) : selectedNav === VIDEO_CHAT_AGENT_VIEW ? (
                                <VideoChatAgentPage />
                            ) : selectedNav === TASKS_VIEW ? (
                                <TasksPage />
                            ) : selectedNav === APPS_VIEW ? (
                                <AppsPage />
                            ) : (

                                <>
                                    {/* Chat body */}
                                    {loadingMessages ? (
                                        <View
                                            style={{
                                                flex: 1,
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}
                                        >
                                            <ActivityIndicator size="large" color={colors.primary} />
                                        </View>
                                    ) : messages.length === 0 ? (
                                        <ChatWelcome onSuggestion={sendMessage} />
                                    ) : (
                                        <FlatList
                                            ref={flatListRef}
                                            data={streamingMessage ? [...messages, streamingMessage] : messages}
                                            keyExtractor={(m) => String(m.id)}
                                            contentContainerStyle={{
                                                paddingHorizontal: chatPadH,
                                                paddingVertical: 24,
                                                paddingBottom: 40,
                                            }}
                                            renderItem={({ item }) => (
                                                <MessageBubble
                                                    msg={item}
                                                    isDesktop={r.isDesktop}
                                                    username={user?.username || "U"}
                                                    colors={colors}
                                                    isTyping={item.isStreaming && !item.content}
                                                />
                                            )}
                                            ListFooterComponent={
                                                isTyping && messages.length === 0 ? (
                                                    <View
                                                        style={{
                                                            flexDirection: "row",
                                                            gap: 12,
                                                            alignItems: "flex-start",
                                                            marginBottom: 24,
                                                            paddingHorizontal: chatPadH,
                                                        }}
                                                    >
                                                        <Image
                                                            source={require("../assets/logo.png")}
                                                            style={{ width: 24, height: 24 }}
                                                            resizeMode="contain"
                                                        />
                                                    </View>
                                                ) : null
                                            }
                                        />
                                    )}

                                    {/* Input */}
                                    <ChatInputArea
                                        onSend={(t, imgs, docs) => sendMessage(t, imgs, docs)}
                                        isGenerating={isGenerating}
                                        onStop={stopGeneration}
                                    />
                                </>
                            )}
                        </View>
                    </View>

                    {/* Artifacts disabled */}

                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ── Mobile / Tablet top bar ────────────────────────────────────────────────
function MobileTopBar({
    onViewReminders,
    colors,
}: {
    onViewReminders?(): void;
    colors: any;
}) {
    const { toggleSidebar } = useSidebar();
    const styles = getLayoutStyles(colors);
    const { notificationCount } = useNotifications();
    return (
        <View style={styles.mobileTopBar}>
            <TouchableOpacity onPress={toggleSidebar} style={{ padding: 6 }}>
                <Ionicons name="menu-outline" size={22} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.mobileLogoRow}>
                <Image source={require('../assets/logo.png')} style={{ width: 20, height: 20 }} resizeMode="contain" />
                <Text style={styles.mobileLogoText}>Cortex</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <TouchableOpacity onPress={onViewReminders} style={{ padding: 6, position: "relative" }}>
                    <Ionicons name="notifications-outline" size={20} color={colors.text} />
                    {notificationCount > 0 && (
                        <View
                            style={{
                                position: "absolute",
                                top: 2,
                                right: 2,
                                minWidth: 14,
                                height: 14,
                                borderRadius: 7,
                                backgroundColor: colors.primary,
                                alignItems: "center",
                                justifyContent: "center",
                                paddingHorizontal: 3,
                            }}
                        >
                            <Text style={{ fontSize: 9, fontFamily: Fonts.semibold, color: colors.textInverse }}>
                                {notificationCount > 9 ? "9+" : notificationCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.mobileUpgradeBtn}>
                    <Text style={styles.mobileUpgradeText}>Upgrade</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Animated Logo Indicator ─────────────────────────────────────
function AnimatedLogo({ colors }: { colors: any }) {
    if (Platform.OS === "web") {
        return (
            <View style={{ width: 24, height: 24 }}>
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
              @keyframes pulseLogo {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.15); opacity: 1; }
              }
              .animated-logo-container {
                animation: pulseLogo 1.5s infinite ease-in-out;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
            `,
                    }}
                />
                <div className="animated-logo-container">
                    <Image
                        source={require('../assets/logo.png')}
                        style={{ width: 24, height: 24 }}
                        resizeMode="contain"
                    />
                </div>
            </View>
        );
    }

    return (
        <Image
            source={require('../assets/logo.png')}
            style={{ width: 24, height: 24 }}
            resizeMode="contain"
        />
    );
}

// ── Thinking Section (collapsible) ─────────────────────────────────────────
function ThinkingSection({
    msg,
    colors,
}: {
    msg: ChatMessage;
    colors: any;
}) {
    const { thinking, toolEvents, isStreaming } = msg;
    const s = msg.content || "";
    const th = msg.thinking || "";

    // If thinking is exactly the same as content (or prefix), it's redundant.
    const isRedundant = th.length > 0 && s.startsWith(th.substring(0, Math.min(th.length, 100)));

    const hasThinking = !!th && !isRedundant;
    const hasTools = toolEvents && toolEvents.length > 0;

    if (!hasThinking && !hasTools && !isStreaming) return null;

    // Helper to map tool name to label/icon
    const getToolInfo = (toolName: string) => {
        switch (toolName) {
            case 'google_search':
                return { label: 'Searching Google', icon: 'search' as const };
            case 'gmail_fetch':
            case 'gmail_search':
                return { label: 'Checking Gmail', icon: 'mail' as const };
            case 'calendar_search':
                return { label: 'Checking Calendar', icon: 'calendar' as const };
            case 'web_scraping':
                return { label: 'Reading website', icon: 'globe' as const };

            default:
                return { label: `Using ${toolName}`, icon: 'construct' as const };
        }
    };

    // If we have reasoning_steps (new chronological model), use them
    if (msg.reasoning_steps && msg.reasoning_steps.length > 0) {
        return (
            <ChainOfThought defaultOpen={true} colors={colors}>
                {msg.reasoning_steps.map((step, i) => {
                    if (step.type === 'tool') {
                        const info = getToolInfo(step.tool);
                        return (
                            <ChainOfThoughtStep
                                key={`step-${i}`}
                                label={`${info.label}${step.status === 'running' ? '...' : ''}`}
                                status={step.status === 'running' ? 'active' : 'complete'}
                                icon={info.icon}
                                description={step.input ? (typeof step.input === 'string' ? step.input : JSON.stringify(step.input)) : undefined}
                                colors={colors}
                            />
                        );
                    } else {
                        // It's a thinking step
                        const isLast = i === msg.reasoning_steps!.length - 1;
                        const hasToolsBefore = msg.reasoning_steps!.slice(0, i).some(s => s.type === 'tool');

                        let label = "Thinking...";
                        if (!isStreaming) {
                            label = hasToolsBefore ? "Reasoning" : "Thinking process";
                        } else if (hasToolsBefore) {
                            label = "Reasoning...";
                        }

                        return (
                            <React.Fragment key={`step-${i}`}>
                                <ChainOfThoughtStep
                                    label={label}
                                    status={step.status === 'active' ? 'active' : 'complete'}
                                    icon="sparkles"
                                    colors={colors}
                                />
                                {step.content ? (
                                    <View style={{ marginLeft: 32, marginBottom: 8 }}>
                                        <Markdown style={getThinkingMarkdownStyles(colors) as any}>
                                            {step.content}
                                        </Markdown>
                                    </View>
                                ) : null}
                            </React.Fragment>
                        );
                    }
                })}
            </ChainOfThought>
        );
    }

    // Fallback for older messages/cached items without reasoning_steps
    return (
        <ChainOfThought defaultOpen={true} colors={colors}>
            {toolEvents?.map((t, i) => {
                const info = getToolInfo(t.tool);
                return (
                    <React.Fragment key={`tool-${i}`}>
                        <ChainOfThoughtStep
                            label={`${info.label}${t.status === 'running' ? '...' : ''}`}
                            status={t.status === 'running' ? 'active' : 'complete'}
                            icon={info.icon}
                            description={t.input ? (typeof t.input === 'string' ? t.input : JSON.stringify(t.input)) : undefined}
                            colors={colors}
                        />
                    </React.Fragment>
                );
            })}

            {hasThinking && (
                <ChainOfThoughtStep
                    label={isStreaming ? "Thinking..." : "Reasoning process"}
                    status={isStreaming ? "active" : "complete"}
                    icon="sparkles"
                    colors={colors}
                />
            )}

            {hasThinking && (
                <View style={{ marginLeft: 32, marginBottom: 8 }}>
                    <Markdown style={getThinkingMarkdownStyles(colors) as any}>
                        {th}
                    </Markdown>
                </View>
            )}

            {isStreaming && !hasThinking && !hasTools && (
                <ChainOfThoughtStep
                    label="Processing..."
                    status="active"
                    icon="ellipsis-horizontal"
                    colors={colors}
                />
            )}
        </ChainOfThought>
    );
}

// ── Message Bubble ─────────────────────────────────────────────────────────
function MessageBubble({
    msg,
    isDesktop,
    username,
    colors,
    isTyping,
}: {
    msg: ChatMessage;
    isDesktop: boolean;
    username: string;
    colors: any;
    isTyping?: boolean;
}) {
    const isUser = msg.role === "user";
    const b = getBubbleStyles(colors);
    const renderAIContent = msg.isStreaming ? (
        <TextGenerateEffect
            words={msg.content}
            style={[b.text, { fontFamily: Fonts.serif }]}
        />
    ) : (
        <Markdown style={getMarkdownStyles(colors) as any}>{msg.content}</Markdown>
    );

    let parsedImageUrls: string[] = [];
    if (msg.image_url) {
        try {
            parsedImageUrls = JSON.parse(msg.image_url);
        } catch (e) {
            parsedImageUrls = [msg.image_url];
        }
    }

    const docUrls: string[] = msg.document_urls || [];

    const getDocIconName = (url: string): any => {
        const ext = url.split(".").pop()?.toLowerCase();
        if (ext === "pdf") return "document-text";
        if (ext === "docx" || ext === "doc") return "document";
        if (ext === "pptx" || ext === "ppt") return "easel";
        return "document";
    };

    const getDocLabel = (url: string) => {
        const parts = url.split("/");
        return parts[parts.length - 1] || url;
    };

    const hasDocs = docUrls.length > 0;
    const hasImages = parsedImageUrls.length > 0;

    const bubbleMaxWidth = isDesktop
        ? isUser ? "60%" : "85%"
        : isUser ? "85%" : "90%";

    return (
        <View style={{ flex: 1 }}>
            {msg.role === "assistant" && (
                <ThinkingSection
                    msg={msg}
                    colors={colors}
                />
            )}
            <View style={[b.row, isUser ? b.rowUser : b.rowAI, { marginBottom: 16 }]}>
                {!isUser && (
                    <Image
                        source={require("../assets/logo.png")}
                        style={{ width: 24, height: 24, marginTop: 4 }}
                        resizeMode="contain"
                    />
                )}
                <View style={{ flexShrink: 1, maxWidth: bubbleMaxWidth }}>
                    <View
                        style={[
                            b.bubble,
                            isUser ? b.userBubble : b.aiBubble,
                        ]}
                    >
                        {hasImages && (
                            <View
                                style={{
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    marginBottom: msg.content || hasDocs ? 8 : 0,
                                }}
                            >
                                {parsedImageUrls.map((url, i) => (
                                    <Image
                                        key={i}
                                        source={{
                                            uri:
                                                url.startsWith("http") ||
                                                    url.startsWith("blob:") ||
                                                    url.startsWith("file:") ||
                                                    url.startsWith("data:")
                                                    ? url
                                                    : `http://127.0.0.1:8000${url}`,
                                        }}
                                        style={{ width: 200, height: 200, borderRadius: 8 }}
                                        resizeMode="cover"
                                    />
                                ))}
                            </View>
                        )}
                        {hasDocs && (
                            <View style={{ gap: 6, marginBottom: msg.content ? 8 : 0 }}>
                                {docUrls.map((url, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={[b.docChip, isUser && b.docChipUser]}
                                        activeOpacity={0.75}
                                        onPress={() => {
                                            const fullUrl = url.startsWith("http")
                                                ? url
                                                : `http://127.0.0.1:8000${url}`;
                                            if (Platform.OS === "web") {
                                                (window as any).open(fullUrl, "_blank");
                                            } else {
                                                Linking.openURL(fullUrl);
                                            }
                                        }}
                                    >
                                        <Ionicons
                                            name={getDocIconName(url)}
                                            size={16}
                                            color={isUser ? "rgba(255,255,255,0.9)" : colors.primary}
                                        />
                                        <Text
                                            style={[b.docChipText, isUser && b.docChipTextUser]}
                                            numberOfLines={1}
                                        >
                                            {getDocLabel(url)}
                                        </Text>
                                        <Ionicons
                                            name="open-outline"
                                            size={12}
                                            color={
                                                isUser ? "rgba(255,255,255,0.6)" : colors.textSubtle
                                            }
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        {!!msg.content &&
                            (isUser ? (
                                <Text style={[b.text, b.userText]}>{msg.content}</Text>
                            ) : (
                                renderAIContent
                            ))}


                    </View>
                </View>
            </View>
        </View>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const getLayoutStyles = (colors: any) =>
    StyleSheet.create({
        root: { flex: 1, flexDirection: "row", backgroundColor: colors.background },
        main: { flex: 1, flexDirection: "column" },
        artifactContainer: {
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
        },
        drawerOverlay: {
            ...StyleSheet.absoluteFillObject,
            zIndex: 100,
            flexDirection: "row",
            backgroundColor: "rgba(0,0,0,0.6)",
        },
        mobileTopBar: {
            height: 54,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
        },
        mobileLogoRow: {
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
        },
        mobileLogoBox: {
            width: 24,
            height: 24,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
        },
        mobileLogoText: {
            fontSize: 16,
            fontFamily: Fonts.bold,
            color: colors.text,
        },
        mobileUpgradeBtn: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 7,
            backgroundColor: colors.text,
        },
        mobileUpgradeText: {
            fontSize: 12,
            fontFamily: Fonts.semibold,
            color: colors.background,
        },
    });

const getBubbleStyles = (colors: any) =>
    StyleSheet.create({
        row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
        rowUser: { justifyContent: "flex-end" },
        rowAI: { justifyContent: "flex-start" },
        aiAvatar: {
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
        },
        userAvatar: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.surfaceHover,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
        },
        userAvatarText: {
            fontSize: 13,
            fontFamily: Fonts.semibold,
            color: colors.text,
        },
        bubble: { borderRadius: 16 },
        userBubble: {
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: colors.primary,
            borderBottomRightRadius: 4,
        },
        aiBubble: {
            backgroundColor: "transparent",
            paddingHorizontal: 0,
            paddingTop: 4,
            paddingBottom: 0,
        },
        text: {
            fontSize: 15,
            fontFamily: Fonts.regular,
            color: colors.text,
            lineHeight: 24,
        },
        userText: { color: "#fff" },
        docChip: {
            flexDirection: "row" as const,
            alignItems: "center" as const,
            gap: 6,
            backgroundColor: colors.primaryBg,
            borderWidth: 1,
            borderColor: colors.primary + "44",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 7,
        },
        docChipUser: {
            backgroundColor: "rgba(255,255,255,0.18)",
            borderColor: "rgba(255,255,255,0.35)",
        },
        docChipText: {
            flex: 1,
            fontSize: 12,
            fontFamily: Fonts.medium,
            color: colors.text,
        },
        docChipTextUser: {
            color: "#fff",
        },
    });

const getThinkingMarkdownStyles = (colors: any) =>
    StyleSheet.create({
        body: {
            fontSize: 13,
            fontFamily: Fonts.regular,
            color: colors.textSubtle,
            lineHeight: 20,
        },
        paragraph: { marginBottom: 4 },
    });

const getMarkdownStyles = (colors: any) =>
    StyleSheet.create({
        body: {
            fontSize: 15,
            fontFamily: Fonts.serif,
            color: colors.text,
            lineHeight: 24,
        },
        code_block: {
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 8,
            padding: 12,
            marginVertical: 8,
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            color: colors.text,
            fontSize: 13,
        },
        code_inline: {
            backgroundColor: colors.surfaceHover,
            borderRadius: 4,
            padding: 4,
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            color: colors.text,
        },
        heading1: {
            fontSize: 24,
            fontFamily: Fonts.bold,
            color: colors.text,
            marginVertical: 8,
        },
        heading2: {
            fontSize: 20,
            fontFamily: Fonts.bold,
            color: colors.text,
            marginVertical: 8,
        },
        heading3: {
            fontSize: 18,
            fontFamily: Fonts.semibold,
            color: colors.text,
            marginVertical: 8,
        },
        heading4: {
            fontSize: 16,
            fontFamily: Fonts.semibold,
            color: colors.text,
            marginVertical: 8,
        },
        link: { color: colors.primary, textDecorationLine: "underline" },
        paragraph: { marginBottom: 8, marginTop: 0 },
        list_item: { marginBottom: 4 },
        strong: { fontFamily: Fonts.serifBold },
        em: { fontStyle: "italic" },
        blockquote: {
            borderLeftWidth: 4,
            borderLeftColor: colors.border,
            paddingLeft: 12,
            opacity: 0.8,
            marginVertical: 8,
        },
    });
