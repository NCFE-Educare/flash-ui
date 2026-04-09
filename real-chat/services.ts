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

// ── Kanban Types ─────────────────────────────────────────────────────────────
export interface Workspace {
    id: number;
    name: string;
    description: string;
    owner_id: number;
    created_at: string;
    updated_at: string;
}

export interface WorkspaceMember {
    id: number;
    workspace_id: number;
    user_id: number;
    role: 'owner' | 'member';
    email: string;
    username: string;
    added_at: string;
}

export interface BoardColumn {
    id: number;
    workspace_id: number;
    name: string;
    position: number;
    color: string;
    created_at: string;
}

export interface Task {
    id: number;
    title: string;
    description?: string;
    assignee_id?: number | null;
    assignee_email?: string | null;
    reporter_id: number;
    priority: "low" | "medium" | "high" | "urgent";
    due_date?: string;
    position: number;
    column_id: number;
    workspace_id: number;
    created_at: string;
    updated_at: string;
    assignee_name?: string;
    reporter_name?: string;
    column_name?: string;
    column_color?: string;
}


export interface TaskComment {
    id: number;
    task_id: number;
    user_id: number;
    comment: string;
    created_at: string;
    username: string;
    email: string;
}

export interface TaskAttachment {
    id: number;
    task_id: number;
    user_id: number;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    created_at: string;
    username: string;
}

export interface WorkspaceDetail {
    workspace: Workspace;
    members: WorkspaceMember[];
    columns: BoardColumn[];
    tasks: Task[];
}

export interface KanbanAnalytics {
    tasks_by_column: { column_name: string; color: string; task_count: number }[];
    tasks_by_priority: { priority: string; count: number }[];
    tasks_by_assignee: { username: string; email: string; task_count: number }[];
    overdue_tasks: { id: number; title: string; due_date: string; assignee_name: string }[];
    completion_rate: number;
    total_tasks: number;
    completed_tasks: number;
    tasks_over_time: { date: string; count: number }[];
}

export interface DashboardSummary {
    workspaces_count: number;
    active_tasks: number;
    overdue_tasks: number;
    completed_this_week: number;
    pending_invitations: number;
    upcoming_tasks: {
        id: number;
        title: string;
        priority: string;
        due_date: string;
        workspace_name: string;
        column_name: string;
    }[];
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

    get: (token: string, sessionId: number, noCache = false) => {
        const url = noCache ? `/sessions/${sessionId}?_t=${Date.now()}` : `/sessions/${sessionId}`;
        return apiFetch<SessionDetail>(url, { token, cache: noCache ? 'no-store' : undefined });
    },

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

// ── Kanban ────────────────────────────────────────────────────────────────────
export const kanbanApi = {
    // Workspaces
    createWorkspace: (token: string, name: string, description: string) =>
        apiFetch<{ workspace: Workspace }>('/workspaces', {
            method: 'POST',
            token,
            body: JSON.stringify({ name, description }),
        }),

    listWorkspaces: (token: string) =>
        apiFetch<{ workspaces: Workspace[] }>('/workspaces', { token }),

    getWorkspace: (token: string, id: number) =>
        apiFetch<WorkspaceDetail>(`/workspaces/${id}`, { token }),

    updateWorkspace: (token: string, id: number, name: string, description: string) =>
        apiFetch<{ workspace: Workspace }>(`/workspaces/${id}`, {
            method: 'PUT',
            token,
            body: JSON.stringify({ name, description }),
        }),

    deleteWorkspace: (token: string, id: number) =>
        apiFetch<{ deleted: boolean }>(`/workspaces/${id}`, { method: 'DELETE', token }),

    // Members
    inviteMember: (token: string, workspaceId: number, email: string) =>
        apiFetch<{ message: string; member?: WorkspaceMember; invitation?: any; user_exists: boolean }>(
            `/workspaces/${workspaceId}/invite`,
            {
                method: 'POST',
                token,
                body: JSON.stringify({ email }),
            }
        ),

    listMembers: (token: string, workspaceId: number) =>
        apiFetch<{ members: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`, { token }),

    acceptInvitation: (token: string, invitationToken: string) =>
        apiFetch<{ message: string; workspace: Workspace }>(`/invitations/accept?token=${invitationToken}`, { token }),

    listPendingInvitations: (token: string) =>
        apiFetch<{ invitations: any[] }>('/invitations/pending', { token }),

    removeMember: (token: string, workspaceId: number, userId: number) =>
        apiFetch<{ removed: boolean }>(`/workspaces/${workspaceId}/members/${userId}`, {
            method: 'DELETE',
            token,
        }),

    // Columns
    listColumns: (token: string, workspaceId: number) =>
        apiFetch<{ columns: BoardColumn[] }>(`/workspaces/${workspaceId}/columns`, { token }),

    createColumn: (token: string, workspaceId: number, name: string, position: number, color: string) =>
        apiFetch<{ column: BoardColumn }>(`/workspaces/${workspaceId}/columns`, {
            method: 'POST',
            token,
            body: JSON.stringify({ name, position, color }),
        }),

    updateColumn: (token: string, columnId: number, name: string, position: number, color: string) =>
        apiFetch<{ column: BoardColumn }>(`/columns/${columnId}`, {
            method: 'PUT',
            token,
            body: JSON.stringify({ name, position, color }),
        }),

    deleteColumn: (token: string, columnId: number) =>
        apiFetch<{ deleted: boolean }>(`/columns/${columnId}`, { method: 'DELETE', token }),

    // Tasks
    createTask: (token: string, workspaceId: number, taskData: Partial<Task>) =>
        apiFetch<{ task: Task }>(`/workspaces/${workspaceId}/tasks`, {
            method: 'POST',
            token,
            body: JSON.stringify(taskData),
        }),

    listTasks: (token: string, workspaceId: number) =>
        apiFetch<{ tasks: Task[] }>(`/workspaces/${workspaceId}/tasks`, { token }),

    getTask: (token: string, taskId: number) =>
        apiFetch<{ task: Task; comments: TaskComment[]; attachments: TaskAttachment[] }>(`/tasks/${taskId}`, { token }),

    updateTask: (token: string, taskId: number, taskData: Partial<Task>) =>
        apiFetch<{ task: Task }>(`/tasks/${taskId}`, {
            method: 'PATCH',
            token,
            body: JSON.stringify(taskData),
        }),

    deleteTask: (token: string, taskId: number) =>
        apiFetch<{ deleted: boolean }>(`/tasks/${taskId}`, { method: 'DELETE', token }),

    // Comments
    addComment: (token: string, taskId: number, comment: string) =>
        apiFetch<{ comment: TaskComment }>(`/tasks/${taskId}/comments`, {
            method: 'POST',
            token,
            body: JSON.stringify({ comment }),
        }),

    listComments: (token: string, taskId: number) =>
        apiFetch<{ comments: TaskComment[] }>(`/tasks/${taskId}/comments`, { token }),

    // Attachments
    uploadAttachment: async (token: string, taskId: number, fileUri: string, fileName: string) => {
        const formData = new FormData();
        const extension = fileUri.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = extension === 'pdf' ? 'application/pdf' : 'image/jpeg';

        if (Platform.OS === 'web') {
            const response = await fetch(fileUri);
            const blob = await response.blob();
            formData.append('file', blob, fileName);
        } else {
            // @ts-ignore
            formData.append('file', {
                uri: fileUri,
                type: mimeType,
                name: fileName
            });
        }

        const res = await fetch(`${BASE_URL}/tasks/${taskId}/attachments`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.detail || `Upload failed with status ${res.status}`);
        }

        return res.json() as Promise<{ attachment: TaskAttachment }>;
    },

    listAttachments: (token: string, taskId: number) =>
        apiFetch<{ attachments: TaskAttachment[] }>(`/tasks/${taskId}/attachments`, { token }),

    // Activity & Analytics
    getActivity: (token: string, workspaceId: number, limit = 50) =>
        apiFetch<{ activity: any[] }>(`/workspaces/${workspaceId}/activity?limit=${limit}`, { token }),

    getWorkspaceAnalytics: (token: string, workspaceId: number) =>
        apiFetch<KanbanAnalytics>(`/workspaces/${workspaceId}/analytics`, { token }),

    getMyAnalytics: (token: string) =>
        apiFetch<any>('/analytics/me', { token }),

    getDashboardSummary: (token: string) =>
        apiFetch<DashboardSummary>('/dashboard/summary', { token }),
};
