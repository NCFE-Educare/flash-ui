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
import { sessionsApi, chatApi, Session, ChatMessage } from "../services/api";
import Sidebar from "../components/Sidebar";
import ChatTopBar from "../components/ChatTopBar";
import ChatWelcome from "../components/ChatWelcome";
import ChatInputArea from "../components/ChatInputArea";
import Markdown from "react-native-markdown-display";

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

      // Add streaming placeholder immediately so text events can update it
      setMessages((prev) => [
        ...prev,
        {
          id: aiId,
          role: "assistant",
          content: "",
          created_at: new Date().toISOString(),
          isStreaming: true,
        },
      ]);
      setIsTyping(false);

      let currentContent = "";

      for await (const { type, data } of readSSE(res.body)) {
        if (type === "text") {
          // Append each token chunk — render as plain Text during streaming
          // to avoid broken mid-stream markdown
          currentContent += data.content;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, content: currentContent } : m,
            ),
          );
        } else if (type === "tool_start") {
          // Show a tool-use indicator inline
          currentContent += `\n\n*Using ${data.tool}...*\n\n`;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, content: currentContent } : m,
            ),
          );
        } else if (type === "tool_end") {
          // Tool finished; next text event will bring the result
        } else if (type === "done") {
          // Replace streamed chunks with the final clean reply
          // and switch off streaming mode so Markdown is rendered
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? { ...m, content: data.reply, isStreaming: false }
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
  const chatPadH = r.isDesktop ? 120 : r.isTablet ? 40 : 0;

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
            {/* Top bar */}
            {r.isDesktop ? (
              <ChatTopBar
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() => setSidebarCollapsed(false)}
              />
            ) : (
              <MobileTopBar
                onOpenDrawer={() => setDrawerOpen(true)}
                colors={colors}
              />
            )}

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
                  />
                )}
                ListFooterComponent={
                  isTyping ? (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        alignItems: "flex-start",
                        marginBottom: 24,
                        paddingHorizontal: chatPadH,
                      }}
                    >
                      <LinearGradient
                        colors={[colors.primary, colors.primaryLight]}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: 2,
                        }}
                      >
                        <Ionicons name="sparkles" size={13} color="#fff" />
                      </LinearGradient>
                      <View
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          borderRadius: 16,
                          borderBottomLeftRadius: 4,
                          backgroundColor: colors.surfaceSecondary,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <TypingDots colors={colors} />
                      </View>
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
  colors,
}: {
  onOpenDrawer(): void;
  colors: any;
}) {
  const styles = getLayoutStyles(colors);
  return (
    <View style={styles.mobileTopBar}>
      <TouchableOpacity onPress={onOpenDrawer} style={{ padding: 6 }}>
        <Ionicons name="menu-outline" size={22} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.mobileLogoRow}>
        <LinearGradient
          colors={[colors.primaryDark, colors.primaryLight]}
          style={styles.mobileLogoBox}
        >
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

// ── Animated Typing Indicator ─────────────────────────────────────
function TypingDots({ colors }: { colors: any }) {
  if (Platform.OS === "web") {
    const dotStyle = {
      width: "8px",
      height: "8px",
      borderRadius: "4px",
      backgroundColor: colors.primary,
      animation: "typingBounce 1.4s infinite ease-in-out",
    };
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingVertical: 6,
          paddingHorizontal: 2,
          height: 24,
        }}
      >
        {/* Inject CSS keyframes globally for web */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
                    @keyframes typingBounce {
                        0%, 80%, 100% { transform: translateY(0); }
                        40% { transform: translateY(-6px); }
                    }
                `,
          }}
        />
        <div style={{ ...dotStyle, animationDelay: "-0.32s" }} />
        <div style={{ ...dotStyle, animationDelay: "-0.16s" }} />
        <div style={{ ...dotStyle, animationDelay: "0s" }} />
      </View>
    );
  }

  // Fallback for native (iOS/Android)
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const bounce = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -6,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.delay(400),
        ]),
      );
    const anims = dots.map((d, i) => bounce(d, i * 150));
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 6,
        paddingHorizontal: 2,
        height: 24,
      }}
    >
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.primary,
            transform: [{ translateY: dot }],
          }}
        />
      ))}
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
  // Render plain Text during streaming to avoid broken mid-stream Markdown,
  // switch to Markdown only when the final reply has arrived.
  const renderAIContent = msg.isStreaming ? (
    <Text style={b.text}>{msg.content}</Text>
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
    // Strip the hash prefix added by the backend (e.g. "abc123.pdf" → show as-is, but try to shorten)
    const parts = url.split("/");
    return parts[parts.length - 1] || url;
  };

  const hasDocs = docUrls.length > 0;
  const hasImages = parsedImageUrls.length > 0;

  return (
    <View style={[b.row, isUser ? b.rowUser : b.rowAI, { marginBottom: 24 }]}>
      {!isUser && (
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          style={b.aiAvatar}
        >
          <Ionicons name="sparkles" size={13} color="#fff" />
        </LinearGradient>
      )}
      <View
        style={[
          b.bubble,
          isUser ? b.userBubble : b.aiBubble,
          {
            maxWidth: isDesktop
              ? isUser
                ? "60%"
                : "85%"
              : isUser
                ? "85%"
                : "90%",
          },
          isTyping && !isUser
            ? { minWidth: 60, alignItems: "flex-start", paddingTop: 6 }
            : undefined,
          (hasImages || hasDocs) && isUser
            ? { paddingHorizontal: 8, paddingVertical: 8 }
            : undefined,
        ]}
      >
        {isTyping ? (
          <TypingDots colors={colors} />
        ) : (
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
      {isUser && (
        <View style={b.userAvatar}>
          <Text style={b.userAvatarText}>
            {username.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
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
