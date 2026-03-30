import { Platform } from 'react-native';

export const BASE_URL = 'http://127.0.0.1:8000';

// ── Generic fetch wrapper ─────────────────────────────────────────────────────
export async function apiFetch<T = any>(
    path: string,
    options: RequestInit & { token?: string } = {}
): Promise<T> {
    const { token, headers = {}, ...rest } = options;
    const res = await fetch(`${BASE_URL}${path}`, {
        ...rest,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(headers as Record<string, string>),
        },
    });

    if (res.status === 204) return undefined as T;

    const data = await res.json();
    if (!res.ok) {
        const msg = data?.detail ?? `Error ${res.status}`;
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TokenResponse {
    access_token: string;
    token_type: string;
}
export interface UserInfo {
    id: number;
    email: string;
    username: string;
}
export interface Session {
    id: number;
    title: string;
    created_at: string;
    updated_at?: string;
}
export interface SessionDetail extends Session {
    messages: ChatMessage[];
}
export interface ToolEvent {
    tool: string;
    status: 'running' | 'done';
    input?: any;
}
export type ReasoningStep = 
  | { type: 'thinking'; content: string; status: 'active' | 'complete' }
  | { type: 'tool'; tool: string; status: 'running' | 'done'; input?: any };

export interface ChatMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    image_url?: string;
    document_urls?: string[];
    created_at: string;
    isStreaming?: boolean;
    thinking?: string;
    isThinking?: boolean;
    toolEvents?: ToolEvent[];
    reasoning_steps?: ReasoningStep[];
}
export interface ChatResponse {
    reply: string;
    user: string;
    session_id: number;
}
export interface UploadResponse {
    image_urls: string[];
}
export interface DocumentUploadResponse {
    document_urls: string[];
}

export interface Reminder {
    id: number;
    message: string;
    remind_at: string;
    delivered?: boolean;
    created_at?: string;
}

export interface Memory {
    id: string;
    memory: string;
    categories?: string[];
    created_at: string;
    updated_at: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
    signup: (email: string, username: string, password: string) =>
        apiFetch<TokenResponse>('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, username, password }),
        }),

    login: (email: string, password: string) =>
        apiFetch<TokenResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    me: (token: string) =>
        apiFetch<UserInfo>('/auth/me', { token }),
};

// ── Integrations ──────────────────────────────────────────────────────────────
export const integrationsApi = {
    gmailStatus: (token: string) =>
        apiFetch<{ connected: boolean }>('/auth/gmail/status', { token }).then((data) => data?.connected === true).catch(() => false),
    gmailConnect: (token: string) =>
        apiFetch<{ url?: string }>('/auth/gmail/connect', { token }),
    gmailDisconnect: (token: string) =>
        apiFetch('/auth/gmail/disconnect', { method: 'DELETE', token }),
    sheetsStatus: (token: string) =>
        apiFetch<{ connected: boolean }>('/auth/sheets/status', { token }).then((data) => data?.connected === true).catch(() => false),
    sheetsConnect: (token: string) =>
        apiFetch<{ url?: string }>('/auth/sheets/connect', { token }),
    sheetsDisconnect: (token: string) =>
        apiFetch('/auth/sheets/disconnect', { method: 'DELETE', token }),
    docsStatus: (token: string) =>
        apiFetch<{ connected: boolean }>('/auth/docs/status', { token }).then((data) => data?.connected === true).catch(() => false),
    docsConnect: (token: string) =>
        apiFetch<{ url?: string }>('/auth/docs/connect', { token }),
    docsDisconnect: (token: string) =>
        apiFetch('/auth/docs/disconnect', { method: 'DELETE', token }),
    driveStatus: (token: string) =>
        apiFetch<{ connected: boolean }>('/auth/drive/status', { token }).then((data) => data?.connected === true).catch(() => false),
    driveConnect: (token: string) =>
        apiFetch<{ url?: string }>('/auth/drive/connect', { token }),
    driveDisconnect: (token: string) =>
        apiFetch('/auth/drive/disconnect', { method: 'DELETE', token }),
    calendarStatus: (token: string) =>
        apiFetch<{ connected: boolean }>('/auth/calendar/status', { token }).then((data) => data?.connected === true).catch(() => false),
    calendarConnect: (token: string) =>
        apiFetch<{ url?: string }>('/auth/calendar/connect', { token }),
    calendarDisconnect: (token: string) =>
        apiFetch('/auth/calendar/disconnect', { method: 'DELETE', token }),
    slidesStatus: (token: string) =>
        apiFetch<{ connected: boolean }>('/auth/slides/status', { token }).then((data) => data?.connected === true).catch(() => false),
    slidesConnect: (token: string) =>
        apiFetch<{ url?: string }>('/auth/slides/connect', { token }),
    slidesDisconnect: (token: string) =>
        apiFetch('/auth/slides/disconnect', { method: 'DELETE', token }),
    formsStatus: (token: string) =>
        apiFetch<{ connected: boolean }>('/auth/forms/status', { token }).then((data) => data?.connected === true).catch(() => false),
    formsConnect: (token: string) =>
        apiFetch<{ url?: string }>('/auth/forms/connect', { token }),
    formsDisconnect: (token: string) =>
        apiFetch('/auth/forms/disconnect', { method: 'DELETE', token }),
    meetStatus: (token: string) =>
        apiFetch<{ connected: boolean }>('/auth/meet/status', { token }).then((data) => data?.connected === true).catch(() => false),
    meetConnect: (token: string) =>
        apiFetch<{ url?: string }>('/auth/meet/connect', { token }),
    meetDisconnect: (token: string) =>
        apiFetch('/auth/meet/disconnect', { method: 'DELETE', token }),
    classroomStatus: (token: string) =>
        apiFetch<{ connected: boolean }>('/auth/classroom/status', { token }).then((data) => data?.connected === true).catch(() => false),
    classroomConnect: (token: string) =>
        apiFetch<{ auth_url?: string; url?: string }>('/auth/classroom/connect', { token }),
    classroomDisconnect: (token: string) =>
        apiFetch('/auth/classroom/disconnect', { method: 'DELETE', token }),
};

// ── Sessions ──────────────────────────────────────────────────────────────────
export const sessionsApi = {
    list: (token: string) =>
        apiFetch<Session[]>('/sessions', { token }),

    create: (token: string, title = 'New Chat') =>
        apiFetch<Session>('/sessions', {
            method: 'POST',
            token,
            body: JSON.stringify({ title }),
        }),

    get: (token: string, sessionId: number) =>
        apiFetch<SessionDetail>(`/sessions/${sessionId}`, { token }),

    rename: (token: string, sessionId: number, title: string) =>
        apiFetch<Session>(`/sessions/${sessionId}`, {
            method: 'PATCH',
            token,
            body: JSON.stringify({ title }),
        }),

    delete: (token: string, sessionId: number) =>
        apiFetch(`/sessions/${sessionId}`, { method: 'DELETE', token }),
};

// ── Files / Upload ────────────────────────────────────────────────────────────
export const fileApi = {
    upload: async (token: string, fileUris: string[]) => {
        const formData = new FormData();

        for (let i = 0; i < fileUris.length; i++) {
            const uri = fileUris[i];
            const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
            const name = `upload_${i}.${extension}`;

            if (Platform.OS === 'web') {
                const response = await fetch(uri);
                const blob = await response.blob();
                formData.append('files', blob, name);
            } else {
                // @ts-ignore - React Native FormData accepts an object with uri, type, and name
                formData.append('files', {
                    uri: uri,
                    type: mimeType,
                    name: name
                });
            }
        }

        const res = await fetch(`${BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                // Don't set Content-Type here; fetch will automatically set it with the boundary for FormData
            },
            body: formData,
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.detail || `Upload failed with status ${res.status}`);
        }

        return res.json() as Promise<UploadResponse>;
    }
};

// ── Document Upload ───────────────────────────────────────────────────────────
export const documentApi = {
    upload: async (token: string, files: File[]): Promise<DocumentUploadResponse> => {
        const formData = new FormData();
        for (const file of files) {
            formData.append('files', file, file.name);
        }
        const res = await fetch(`${BASE_URL}/upload/document`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.detail || `Document upload failed with status ${res.status}`);
        }
        return res.json();
    },
};

// ── Reminders ──────────────────────────────────────────────────────────────────
export const remindersApi = {
    pending: (token: string) =>
        apiFetch<{ reminders: Reminder[] }>('/reminders/pending', { token }),

    list: (token: string, includeDelivered = false) =>
        apiFetch<Reminder[]>(`/reminders?include_delivered=${includeDelivered}`, { token }),

    delete: (token: string, id: number) =>
        apiFetch(`/reminders/${id}`, { method: 'DELETE', token }),
};

// ── Memories ──────────────────────────────────────────────────────────────────
export const memoryApi = {
    list: (token: string) =>
        apiFetch<Memory[]>('/memory', { token }),

    update: (token: string, id: string, fact: string) =>
        apiFetch<Memory>(`/memory/${id}`, {
            method: 'PUT',
            token,
            body: JSON.stringify({ fact }),
        }),

    delete: (token: string, id: string) =>
        apiFetch(`/memory/${id}`, { method: 'DELETE', token }),

    search: (token: string, query: string) =>
        apiFetch<Memory[]>('/memory/search', {
            method: 'POST',
            token,
            body: JSON.stringify({ query }),
        }),
};

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatApi = {
    send: (token: string, message: string, session_id?: number | null, image_urls?: string[]) =>
        apiFetch<ChatResponse>('/chat', {
            method: 'POST',
            token,
            body: JSON.stringify({ message, session_id: session_id ?? null, image_urls }),
        }),
    sendStream: async (token: string, message: string, session_id?: number | null, image_urls?: string[], document_urls?: string[], signal?: AbortSignal) => {
        const response = await fetch(`${BASE_URL}/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ message, session_id: session_id ?? null, image_urls, document_urls }),
            signal,
        });
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || `Stream failed with status ${response.status}`);
        }
        return response;
    },
};
