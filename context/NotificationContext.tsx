import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import EventSource from "react-native-sse";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";
import { BASE_URL, remindersApi, Reminder } from "../services/api";
const NOTIFICATIONS_STORAGE_KEY = "cortex_notifications";

export interface Notification {
  id: string;
  message: string;
  createdAt: string;
}

async function loadStoredNotifications(): Promise<Notification[]> {
  try {
    let list: Notification[] = [];
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        list = Array.isArray(parsed) ? parsed : [];
      }
    } else {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        list = Array.isArray(parsed) ? parsed : [];
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

async function saveNotifications(list: Notification[]) {
  try {
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
    } else {
      await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list));
    }
  } catch {}
}

interface NotificationContextValue {
  notifications: Notification[];
  notificationCount: number;
  dismissNotification: (id: string) => void;
  dismissAllNotifications: () => void;
  pendingReminders: Reminder[];
  refreshPending: () => Promise<void>;
  registerResponseDone: (fn: (sessionId: number) => void) => () => void;
  navigateToReminders: () => void;
  navigateToRemindersTrigger: number;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [navigateToRemindersTrigger, setNavigateToRemindersTrigger] = useState(0);
  const responseDoneRef = useRef<((sessionId: number) => void) | null>(null);


  useEffect(() => {
    loadStoredNotifications().then(setNotifications);
  }, []);

  const registerResponseDone = useCallback((fn: (sessionId: number) => void) => {
    responseDoneRef.current = fn;
    return () => {
      responseDoneRef.current = null;
    };
  }, []);

  const navigateToReminders = useCallback(() => {
    setNavigateToRemindersTrigger((n) => n + 1);
  }, []);

  const addNotification = useCallback((message: string) => {
    const n: Notification = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const next = [n, ...prev];
      saveNotifications(next);
      return next;
    });
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveNotifications(next);
      return next;
    });
  }, []);

  const dismissAllNotifications = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  const refreshPending = useCallback(async () => {
    if (!token) return;
    try {
      const data = await remindersApi.pending(token);
      const list = data?.reminders ?? [];
      setPendingReminders(Array.isArray(list) ? list : []);
    } catch {
      setPendingReminders([]);
    }
  }, [token]);

  // Fetch pending on mount and when token changes
  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  // Single SSE connection for reminders + response_done
  useEffect(() => {
    if (!token) return;

    const url = `${BASE_URL}/chat/notifications?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener("reminder" as any, (event: any) => {
      try {
        const data = JSON.parse(event.data || "{}");
        const msg = data?.message ?? "Reminder";
        addNotification(msg);
        refreshPending();
      } catch (e) {
        console.error("Error parsing reminder event", e);
      }
    });

    es.addEventListener("response_done" as any, (event: any) => {
      try {
        const data = JSON.parse(event.data || "{}");
        const sessionId = data?.session_id;
        if (typeof sessionId === "number") {
          responseDoneRef.current?.(sessionId);
        }
      } catch (e) {
        console.error("Error parsing response_done event", e);
      }
    });

    es.addEventListener("error", () => {});

    return () => es.close();
  }, [token, addNotification, refreshPending]);

  const value: NotificationContextValue = {
    notifications,
    notificationCount: notifications.length,
    dismissNotification,
    dismissAllNotifications,
    pendingReminders,
    refreshPending,
    registerResponseDone,
    navigateToReminders,
    navigateToRemindersTrigger,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
