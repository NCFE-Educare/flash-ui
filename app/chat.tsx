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
  Animated,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Fonts } from "../constants/theme";
import { useResponsive } from "../hooks/useResponsive";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import "text-encoding-polyfill";
import { sessionsApi, chatApi, Session, ChatMessage, ToolEvent } from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import Sidebar from "../components/Sidebar";
import ChatTopBar from "../components/ChatTopBar";
import ChatWelcome from "../components/ChatWelcome";
import ChatInputArea from "../components/ChatInputArea";
import IntegrationsPage from "../components/IntegrationsPage";
import RemindersPage from "../components/RemindersPage";
import Markdown from "react-native-markdown-display";

const CHAT_VIEW = -1;
const INTEGRATIONS_VIEW = 0;
const REMINDERS_VIEW = 1;

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
  } catch {}
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedNav, setSelectedNav] = useState(CHAT_VIEW);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Backend State ──
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

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
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() || "";
      let eventType = "";
      let dataStr = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7);
        } else if (line.startsWith("data: ")) {
          dataStr = line.slice(6);
        } else if (line === "" && dataStr) {
          // Blank line = end of one SSE event
          try {
            yield { type: eventType, data: JSON.parse(dataStr) };
          } catch (e) {
            console.error("Failed to parse SSE data:", dataStr, e);
          }
          eventType = "";
          dataStr = "";
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
      if (!res.body) {
        throw new Error("Streaming not supported on this platform.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: aiId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
          isStreaming: true,
          isThinking: true,
          thinking: "",
          toolEvents: [],
        },
      ]);
      setIsTyping(false);

      let currentContent = "";
      let currentThinking = "";
      let currentTools: ToolEvent[] = [];

      for await (const { type, data } of readSSE(res.body)) {
        if (type === "thinking") {
          currentThinking += data.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, thinking: currentThinking } : m,
            ),
          );
        } else if (type === "text") {
          currentContent += data.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? { ...m, content: currentContent, isThinking: false }
                : m,
            ),
          );
        } else if (type === "tool_start") {
          currentTools = [...currentTools, { tool: data.tool, status: "running" }];
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, toolEvents: currentTools } : m,
            ),
          );
        } else if (type === "tool_end") {
          currentTools = currentTools.map((t) =>
            t.tool === data.tool ? { ...t, status: "done" } : t,
          );
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, toolEvents: currentTools } : m,
            ),
          );
        } else if (type === "done") {
          const sid = activeSessionId || data.session_id;
          if (sid) {
            saveThinkingToCache(sid, data.reply, currentThinking, currentTools);
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? {
                    ...m,
                    content: data.reply,
                    isStreaming: false,
                    isThinking: false,
                  }
                : m,
            ),
          );

          if (!activeSessionId) {
            setActiveSessionId(data.session_id);
            await loadSessions();
          }
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
    setIsGenerating(false);
    setIsTyping(false);
  };

  // ── Layout helpers ──
  const showPersistentSidebar = r.isDesktop && !sidebarCollapsed;
  const sidebarWidth = r.isTablet ? 200 : 250;
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
            {/* Top bar (always visible on Chat, Integrations, Reminders) */}
            {r.isDesktop ? (
              <ChatTopBar
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(false)}
                onViewReminders={() => setSelectedNav(REMINDERS_VIEW)}
              />
            ) : (
              <MobileTopBar
                onOpenDrawer={() => setDrawerOpen(true)}
                onViewReminders={() => setSelectedNav(REMINDERS_VIEW)}
                colors={colors}
              />
            )}

            <View style={{ flex: 1 }}>
            {selectedNav === INTEGRATIONS_VIEW ? (
              <IntegrationsPage />
            ) : selectedNav === REMINDERS_VIEW ? (
              <RemindersPage />
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
                    data={messages}
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
                          <AnimatedLogo colors={colors} />
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
                  onNavChange={(i) => {
                    setSelectedNav(i);
                    setDrawerOpen(false);
                  }}
                  onClose={() => setDrawerOpen(false)}
                  compact={r.isTablet}
                  sessions={sessions}
                  activeSessionId={activeSessionId}
                  onSelectSession={(id) => {
                    selectSession(id);
                    setDrawerOpen(false);
                  }}
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
function MobileTopBar({
  onOpenDrawer,
  onViewReminders,
  colors,
}: {
  onOpenDrawer(): void;
  onViewReminders?(): void;
  colors: any;
}) {
  const styles = getLayoutStyles(colors);
  const { notificationCount } = useNotifications();
  return (
    <View style={styles.mobileTopBar}>
      <TouchableOpacity onPress={onOpenDrawer} style={{ padding: 6 }}>
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

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 750, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.Image
      source={require('../assets/logo.png')}
      style={{
        width: 24,
        height: 24,
        transform: [{ scale: pulseAnim }],
      }}
      resizeMode="contain"
    />
  );
}

// ── Thinking Section (collapsible) ─────────────────────────────────────────
function ThinkingSection({
  thinking,
  isThinking,
  toolEvents,
  isDone,
  colors,
}: {
  thinking: string;
  isThinking: boolean;
  toolEvents: ToolEvent[];
  isDone: boolean;
  colors: any;
}) {
  const [expanded, setExpanded] = useState(!isDone);
  const ts = getThinkingStyles(colors);

  React.useEffect(() => {
    if (isDone) setExpanded(false);
  }, [isDone]);

  if (!thinking && toolEvents.length === 0) return null;

  return (
    <View style={ts.container}>
      <TouchableOpacity
        style={ts.header}
        activeOpacity={0.7}
        onPress={() => setExpanded((v) => !v)}
      >
        <View style={ts.headerLeft}>
          {isThinking && Platform.OS === "web" ? (
            <View>
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                    @keyframes thinkPulse {
                      0%, 100% { opacity: 0.5; }
                      50% { opacity: 1; }
                    }
                    .thinking-indicator { animation: thinkPulse 1.4s ease-in-out infinite; }
                  `,
                }}
              />
              <div className="thinking-indicator">
                <Ionicons name="bulb" size={14} color={colors.primary} />
              </div>
            </View>
          ) : (
            <Ionicons
              name="bulb"
              size={14}
              color={isDone ? colors.textSubtle : colors.primary}
            />
          )}
          <Text style={[ts.headerText, isDone && { color: colors.textSubtle }]}>
            {isThinking ? "Thinking..." : "Thought process"}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.textSubtle}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={ts.body}>
          {!!thinking && <Text style={ts.thinkingText}>{thinking}</Text>}
          {toolEvents.length > 0 && (
            <View style={ts.toolRow}>
              {toolEvents.map((te, i) => (
                <View
                  key={i}
                  style={[
                    ts.toolBadge,
                    te.status === "done" && ts.toolBadgeDone,
                  ]}
                >
                  {te.status === "running" ? (
                    <ActivityIndicator size={10} color={colors.primary} />
                  ) : (
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color="#22c55e"
                    />
                  )}
                  <Text
                    style={[
                      ts.toolBadgeText,
                      te.status === "done" && ts.toolBadgeTextDone,
                    ]}
                  >
                    {te.tool}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
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
    <Text style={b.text}>{msg.content}</Text>
  ) : (
    <Markdown style={getMarkdownStyles(colors) as any}>{msg.content}</Markdown>
  );

  const hasThinking =
    !isUser && (!!msg.thinking || (msg.toolEvents && msg.toolEvents.length > 0));

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
    // Strip the hash prefix added by the backend (e.g. "abc123.pdf" → show as-is, but try to shorten)
    const parts = url.split("/");
    return parts[parts.length - 1] || url;
  };

  const hasDocs = docUrls.length > 0;
  const hasImages = parsedImageUrls.length > 0;

  const bubbleMaxWidth = isDesktop
    ? isUser ? "60%" : "85%"
    : isUser ? "85%" : "90%";

  return (
    <View style={[b.row, isUser ? b.rowUser : b.rowAI, { marginBottom: 16 }]}>
      {!isUser && (
        isTyping ? (
          <AnimatedLogo colors={colors} />
        ) : (
          <Image source={require('../assets/logo.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
        )
      )}
      <View style={{ flexShrink: 1, maxWidth: bubbleMaxWidth }}>
        {hasThinking && (
          <ThinkingSection
            thinking={msg.thinking || ""}
            isThinking={!!msg.isThinking}
            toolEvents={msg.toolEvents || []}
            isDone={!msg.isStreaming}
            colors={colors}
          />
        )}
        <View
          style={[
            b.bubble,
            isUser ? b.userBubble : b.aiBubble,
            hasThinking && { paddingTop: 0 },
          ]}
        >
        {!isTyping && (
          <>
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
          </>
        )}
        </View>
      </View>
      {/* User Avatar removed based on preference */}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const getLayoutStyles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, flexDirection: "row", backgroundColor: colors.background },
    main: { flex: 1, flexDirection: "column" },
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

const getThinkingStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 6,
      overflow: "hidden",
      backgroundColor: colors.surfaceSecondary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 8,
      // @ts-ignore – web only
      cursor: "pointer",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    headerText: {
      fontSize: 13,
      fontFamily: Fonts.medium,
      color: colors.text,
    },
    body: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      gap: 8,
    },
    thinkingText: {
      fontSize: 13,
      fontFamily: Fonts.regular,
      color: colors.textMuted,
      lineHeight: 20,
    },
    toolRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
    },
    toolBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.primaryBg,
      borderWidth: 1,
      borderColor: colors.primary + "44",
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    toolBadgeDone: {
      backgroundColor: "rgba(34, 197, 94, 0.08)",
      borderColor: "rgba(34, 197, 94, 0.3)",
    },
    toolBadgeText: {
      fontSize: 11,
      fontFamily: Fonts.medium,
      color: colors.primary,
    },
    toolBadgeTextDone: {
      color: "#22c55e",
    },
  });

const getMarkdownStyles = (colors: any) =>
  StyleSheet.create({
    body: {
      fontSize: 15,
      fontFamily: Fonts.regular,
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
    strong: { fontFamily: Fonts.bold },
    em: { fontStyle: "italic" },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: colors.border,
      paddingLeft: 12,
      opacity: 0.8,
      marginVertical: 8,
    },
  });
