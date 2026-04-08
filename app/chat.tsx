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
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import "text-encoding-polyfill";
import { sessionsApi, chatApi, Session, ChatMessage, ToolEvent, ReasoningStep } from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import Sidebar from "../components/Sidebar";
import ChatTopBar from "../components/ChatTopBar";
import ChatWelcome from "../components/ChatWelcome";
import ChatInputArea from "../components/ChatInputArea";
import IntegrationsPage from "../components/IntegrationsPage";
import RemindersPage from "../components/RemindersPage";
import MemoriesPage from "../components/MemoriesPage";
import VideoChatAgentPage from "../components/VideoChatAgentPage";
import TasksPage from "../components/TasksPage";

import { TextGenerateEffect } from "../components/TextGenerateEffect";
import Markdown from "react-native-markdown-display";
import {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtImage,
  StepStatus
} from "../components/ChainOfThought";

const CHAT_VIEW = -1;
const INTEGRATIONS_VIEW = 0;
const REMINDERS_VIEW = 1;
const MEMORIES_VIEW = 2;
const VIDEO_CHAT_AGENT_VIEW = 3;
const TASKS_VIEW = 4;

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

// ── Root Content Wrapper to utilize useSidebar hooks ──
function ChatScreenContent() {
  const r = useResponsive();
  const { token, user } = useAuth();
  const { colors, isDark } = useTheme();
  const { isCollapsed, sidebarWidth, toggleSidebar } = useSidebar();

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

  const { registerResponseDone, refreshPending, navigateToRemindersTrigger } = useNotifications();
  
  useEffect(() => {
    return registerResponseDone((finishedSessionId) => {
      loadSessions();
      if (finishedSessionId === activeSessionId && token) {
        if (lastStreamedSessionUpdate.current === finishedSessionId) {
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
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err: any) {
      Alert.alert("Error", "Failed to load chat history. " + err.message);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const readSSE = async function* (stream: any) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines[lines.length - 1];
      for (let i = 0; i < lines.length - 1; i++) {
        const trimmed = lines[i].trim();
        if (trimmed.startsWith("event: ")) { eventType = trimmed.slice(7); }
        else if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data) { try { yield { type: eventType || "text", data: JSON.parse(data) }; } catch (e) {} }
        } else if (trimmed === "") { eventType = ""; }
      }
    }
  };

  const sendMessage = async (text: string, imageUrls?: string[], documentUrls?: string[]) => {
    if (!token) return;
    const tempId = Date.now();
    const newUserMsg: ChatMessage = { id: tempId, role: "user", content: text, image_url: imageUrls && imageUrls.length > 0 ? JSON.stringify(imageUrls) : undefined, document_urls: documentUrls, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsTyping(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    const aiId = tempId + 1;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsGenerating(true);

    try {
      const res = await chatApi.sendStream(token, text, activeSessionId, imageUrls, documentUrls, controller.signal);
      lastStreamedSessionUpdate.current = activeSessionId;
      if (!res.body) throw new Error("Streaming not supported on this platform.");
      const aiMsgBase: ChatMessage = { id: aiId, role: "assistant", content: "", created_at: new Date().toISOString(), isStreaming: true, isThinking: true, thinking: "", toolEvents: [] };
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
            if (currentReasoningSteps.length > 0 && currentReasoningSteps[currentReasoningSteps.length - 1].type === 'thinking') {
              (currentReasoningSteps[currentReasoningSteps.length - 1] as any).content = currentThinking;
            } else {
              currentReasoningSteps.push({ type: 'thinking', content: currentThinking, status: 'active' });
            }
            setStreamingMessage({ ...aiMsgBase, thinking: currentThinking, isThinking: true, reasoning_steps: currentReasoningSteps });
            break;
          case "text":
            currentContent += data.content;
            if (currentReasoningSteps.length > 0 && currentReasoningSteps[currentReasoningSteps.length - 1].type === 'thinking') { currentReasoningSteps[currentReasoningSteps.length - 1].status = 'complete'; }
            setStreamingMessage({ ...aiMsgBase, content: currentContent, thinking: currentThinking, isThinking: false, reasoning_steps: currentReasoningSteps });
            break;
          case "tool_start":
            if (currentReasoningSteps.length > 0 && currentReasoningSteps[currentReasoningSteps.length - 1].type === 'thinking') { currentReasoningSteps[currentReasoningSteps.length - 1].status = 'complete'; }
            currentTools = [...currentTools, { tool: data.tool, status: "running" }];
            currentReasoningSteps.push({ type: 'tool', tool: data.tool, status: 'running', input: data.input });
            setStreamingMessage({ ...aiMsgBase, content: currentContent, thinking: currentThinking, toolEvents: currentTools, reasoning_steps: currentReasoningSteps });
            break;
          case "tool_end":
            currentTools = currentTools.map((t) => t.tool === data.tool ? { ...t, status: "done" } : t);
            currentReasoningSteps = currentReasoningSteps.map((s) => s.type === 'tool' && s.tool === data.tool ? { ...s, status: 'done' } : s);
            setStreamingMessage({ ...aiMsgBase, content: currentContent, thinking: currentThinking, toolEvents: currentTools, reasoning_steps: currentReasoningSteps });
            break;
          case "done":
            const sid = activeSessionId || data.session_id;
            lastStreamedSessionUpdate.current = sid;
            if (sid) { saveThinkingToCache(sid, data.reply, currentThinking, currentTools); }
            let dedupedThinking = currentThinking;
            if (data.reply && currentThinking && data.reply.startsWith(currentThinking.substring(0, 100))) { dedupedThinking = ""; }
            const finalMsg: ChatMessage = { ...aiMsgBase, content: data.reply, thinking: dedupedThinking || currentThinking, toolEvents: currentTools, reasoning_steps: currentReasoningSteps.map(s => s.type === 'thinking' ? { ...s, status: 'complete' } : { ...s, status: 'done' }), isStreaming: false, isThinking: false };
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
            if (!activeSessionId) { setActiveSessionId(data.session_id); await loadSessions(); }
            break;
        }
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      if (err.name === "AbortError") { console.log("Stream aborted by user"); }
      else { console.error("Chat error:", err); Alert.alert("Error", err.message || "Failed to send message"); setMessages((prev) => prev.filter((m) => m.id !== tempId)); }
    } finally {
      setIsTyping(false);
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    if (animationTimeoutRef.current) { clearTimeout(animationTimeoutRef.current); animationTimeoutRef.current = null; }
    setStreamingMessage(null); setIsGenerating(false); setIsTyping(false);
  };

  const handleExportChat = async () => {
    if (Platform.OS !== "web") { Alert.alert("Export", "Exporting chat is currently only supported on web."); return; }
    if (!activeSessionId || !token) { Alert.alert("Export", "No active session to export."); return; }
    try {
      const detail = await sessionsApi.get(token, activeSessionId, true);
      let sessionMessages: ChatMessage[] = [];
      const responseData = detail as any;
      if (responseData.messages && Array.isArray(responseData.messages)) { sessionMessages = responseData.messages; }
      else if (responseData.detail && Array.isArray(responseData.detail)) { sessionMessages = responseData.detail.map((m: any) => ({ ...m, role: m.role || (m.type === 'string' ? 'assistant' : 'user'), content: m.content || m.msg || (typeof m === 'string' ? m : "") })).filter((m: any) => m.role && m.content); }
      if (sessionMessages.length === 0) { Alert.alert("Export", "No messages found in this session."); return; }
      // @ts-ignore
      const { exportChatToPDF } = await import("../services/exportService");
      await exportChatToPDF(sessionMessages, user?.username || "USER");
    } catch (err: any) { console.error("Export error:", err); Alert.alert("Export Error", "Failed to generate PDF. " + err.message); }
  };

  const showPersistentSidebar = r.isDesktop || r.isTablet;
  const chatPadH = r.isDesktop ? 120 : r.isTablet ? 40 : 16;
  const layout = getLayoutStyles(colors);

  return (
    <View style={layout.root}>
      {/* ── Persistent sidebar (desktop/tablet) ── */}
      {showPersistentSidebar && (
        <Sidebar
          selectedNav={selectedNav}
          onNavChange={setSelectedNav}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={selectSession}
          onRefreshSessions={loadSessions}
        />
      )}

      {/* ── Main content ── */}
      <View style={layout.main}>
        {showPersistentSidebar ? (
          <ChatTopBar
            sidebarCollapsed={isCollapsed}
            onToggleSidebar={toggleSidebar}
            onViewReminders={() => setSelectedNav(REMINDERS_VIEW)}
            onExportChat={handleExportChat}
          />
        ) : (
          <MobileTopBar onOpenDrawer={() => setDrawerOpen(true)} onViewReminders={() => setSelectedNav(REMINDERS_VIEW)} colors={colors} />
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
          ) : (
            <>
              {loadingMessages ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}><ActivityIndicator size="large" color={colors.primary} /></View>
              ) : messages.length === 0 ? (
                <ChatWelcome onSuggestion={sendMessage} />
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={streamingMessage ? [...messages, streamingMessage] : messages}
                  keyExtractor={(m) => String(m.id)}
                  contentContainerStyle={{ paddingHorizontal: chatPadH, paddingVertical: 24, paddingBottom: 40 }}
                  renderItem={({ item }) => <MessageBubble msg={item} isDesktop={r.isDesktop} username={user?.username || "U"} colors={colors} isTyping={item.isStreaming && !item.content} />}
                />
              )}
              <ChatInputArea onSend={(t, imgs, docs) => sendMessage(t, imgs, docs)} isGenerating={isGenerating} onStop={stopGeneration} />
            </>
          )}
        </View>
      </View>

      {/* ── Mobile drawer overlay ── */}
      {!showPersistentSidebar && drawerOpen && (
        <View style={layout.drawerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setDrawerOpen(false)} />
          <View style={{ width: sidebarWidth }}>
            <Sidebar selectedNav={selectedNav} onNavChange={(i) => { setSelectedNav(i); setDrawerOpen(false); }} onClose={() => setDrawerOpen(false)} sessions={sessions} activeSessionId={activeSessionId} onSelectSession={(id) => { selectSession(id); setDrawerOpen(false); }} onRefreshSessions={loadSessions} />
          </View>
        </View>
      )}
    </View>
  );
}

export default function ChatScreen() {
  return (
    <SidebarProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ChatScreenContent />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SidebarProvider>
  );
}

// ── Mobile / Tablet top bar ──
function MobileTopBar({ onOpenDrawer, onViewReminders, colors }: { onOpenDrawer(): void; onViewReminders?(): void; colors: any; }) {
  const styles = getLayoutStyles(colors);
  const { notificationCount } = useNotifications();
  return (
    <View style={styles.mobileTopBar}>
      <TouchableOpacity onPress={onOpenDrawer} style={{ padding: 6 }}><Ionicons name="menu-outline" size={22} color={colors.text} /></TouchableOpacity>
      <View style={styles.mobileLogoRow}><Image source={require('../assets/logo.png')} style={{ width: 20, height: 20 }} resizeMode="contain" /><Text style={styles.mobileLogoText}>Cortex</Text></View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <TouchableOpacity onPress={onViewReminders} style={{ padding: 6, position: "relative" }}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {notificationCount > 0 && <View style={{ position: "absolute", top: 2, right: 2, minWidth: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 }}><Text style={{ fontSize: 9, fontFamily: Fonts.semibold, color: colors.textInverse }}>{notificationCount > 9 ? "9+" : notificationCount}</Text></View>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.mobileUpgradeBtn}><Text style={styles.mobileUpgradeText}>Upgrade</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function getToolInfo(tool: string) {
  switch (tool) {
    case 'google_search':
    case 'web_search': return { icon: 'search-outline', label: 'Searching web' };
    case 'calculator':
    case 'wolfram_alpha': return { icon: 'md-calculator-outline', label: 'Calculating' };
    case 'python_interpreter':
    case 'code_interpreter': return { icon: 'code-working-outline', label: 'Executing code' };
    case 'memory_retrieval': return { icon: 'brain-outline', label: 'Retrieving memory' };
    default: return { icon: 'construct-outline', label: `Using ${tool}` };
  }
}

function ThinkingSection({ msg, colors }: { msg: ChatMessage; colors: any }) {
  if (!msg.reasoning_steps || msg.reasoning_steps.length === 0) {
    if (!msg.thinking) return null;
    return (
      <ChainOfThought colors={colors}>
        <ChainOfThoughtStep 
          label="Thinking..." 
          description={msg.thinking} 
          status={msg.isThinking ? 'active' : 'complete'} 
          colors={colors} 
        />
      </ChainOfThought>
    );
  }

  return (
    <ChainOfThought colors={colors}>
      {msg.reasoning_steps.map((step, idx) => {
        const stepStatus = (step.status === 'done' ? 'complete' : step.status) as StepStatus;
        if (step.type === 'thinking') {
          return (
            <ChainOfThoughtStep
              key={`step-${idx}`}
              label="Brainstorming"
              description={step.content}
              status={stepStatus}
              icon="sparkles-outline"
              colors={colors}
            />
          );
        } else {
          const info = getToolInfo(step.tool || '');
          return (
            <ChainOfThoughtStep
              key={`step-${idx}`}
              label={info.label}
              description={step.input}
              status={stepStatus}
              icon={info.icon as any}
              colors={colors}
            />
          );
        }
      })}
    </ChainOfThought>
  );
}

function MessageBubble({ msg, isDesktop, username, colors, isTyping }: any) {
  const isUser = msg.role === "user";
  const { isDark } = useTheme();
  const layout = getLayoutStyles(colors);

  // Filter out unwanted placeholder text
  if (!isTyping && msg.content === "(no response)") return null;

  return (
    <View style={[
      layout.msgContainer, 
      { alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 24 }
    ]}>
      <View style={[
        layout.msgRow, 
        { justifyContent: isUser ? 'flex-end' : 'flex-start', width: '100%' }
      ]}>
        
        {!isUser && (
          /* AI Avatar */
          <View style={[layout.avatar, { marginRight: 12 }]}>
            <Image source={require("../assets/logo.png")} style={layout.aiAvatarImg} resizeMode="contain" />
          </View>
        )}

        {/* Content Area */}
        <View style={[
          layout.msgContentArea, 
          { alignItems: isUser ? 'flex-end' : 'flex-start' }
        ]}>
          {!isUser && <Text style={layout.senderName}>Cortex</Text>}
          
          <View style={[
            layout.bubble,
            isUser ? layout.userBubble : layout.aiBubble,
            { maxWidth: isDesktop ? '75%' : '85%' }
          ]}>
            {isUser ? (
              <LinearGradient
                colors={[colors.primary, isDark ? '#a855f7' : '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={layout.userGradientBubble}
              >
                <MessageContent content={msg.content} isStreaming={msg.isStreaming} colors={colors} isUser={true} />
              </LinearGradient>
            ) : (
              <View style={layout.aiContentWrapper}>
                {(msg.thinking || (msg.reasoning_steps && msg.reasoning_steps.length > 0)) && (
                  <ThinkingSection msg={msg} colors={colors} />
                )}
                <MessageContent content={msg.content} isStreaming={msg.isStreaming} colors={colors} isUser={false} />
              </View>
            )}
          </View>
        </View>

        {isUser && (
          /* User Avatar */
          <View style={[layout.avatar, { marginLeft: 12, backgroundColor: colors.primary + '20' }]}>
            <Text style={layout.avatarText}>{username.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function MessageContent({ content, isStreaming, colors, isUser }: any) {
  if (!content && isStreaming) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
        <ActivityIndicator size="small" color={isUser ? "#fff" : colors.primary} />
        <Text style={{ fontStyle: "italic", color: isUser ? "rgba(255,255,255,0.7)" : colors.textSubtle, fontSize: 13 }}>
          {isUser ? "Sending..." : "Cortex is thinking..."}
        </Text>
      </View>
    );
  }
  
  if (!content || content === "(no response)") return null;

  return (
    <Markdown
      style={{
        body: { 
          color: isUser ? "#fff" : colors.text, 
          fontSize: 15, 
          lineHeight: 24, 
          fontFamily: isUser ? Fonts.medium : Fonts.regular 
        },
        code_inline: { 
          backgroundColor: isUser ? "rgba(0,0,0,0.1)" : colors.surfaceHover, 
          color: isUser ? "#fff" : colors.primary, 
          paddingHorizontal: 4, 
          borderRadius: 4 
        },
        fence: { 
          backgroundColor: isUser ? "rgba(0,0,0,0.2)" : colors.surfaceSecondary, 
          borderRadius: 12, 
          padding: 12, 
          marginVertical: 8, 
          borderColor: isUser ? "rgba(255,255,255,0.1)" : colors.border, 
          borderWidth: 1 
        },
        link: { color: isUser ? "#fff" : colors.primary, textDecorationLine: "underline" },
        strong: { color: isUser ? "#fff" : colors.text, fontFamily: Fonts.bold },
      }}
    >
      {content}
    </Markdown>
  );
}

const getLayoutStyles = (colors: any) => StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: colors.background },
  main: { flex: 1, height: "100%", backgroundColor: colors.background },
  mobileTopBar: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  mobileLogoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mobileLogoText: { fontSize: 16, fontFamily: Fonts.bold, color: colors.text },
  mobileUpgradeBtn: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  mobileUpgradeText: { color: "#fff", fontSize: 11, fontFamily: Fonts.bold },
  drawerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000 },
  
  msgContainer: { width: "100%" },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  aiAvatarImg: { width: 28, height: 28 },
  avatarText: { fontSize: 13, fontFamily: Fonts.bold, color: colors.primary },
  msgContentArea: { flexShrink: 1, flexGrow: 0 },
  senderName: { fontSize: 13, fontFamily: Fonts.bold, color: colors.text, marginBottom: 4 },
  bubble: { flexShrink: 1 },
  aiContentWrapper: { width: '100%' },
  userBubble: { 
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  userGradientBubble: {
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 18, 
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end'
  },
  aiBubble: { backgroundColor: "transparent" },
});

