import { Platform } from 'react-native';

export const VIDEO_AGENT_BASE_URL = 'http://localhost:8001';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiveKitTokenResponse {
    token: string;
    url: string;
    room_name: string;
}

export interface Circular {
    id: string;
    circular_id: string;
    title: string;
    date: string;
    category: string;
    url?: string;
    processed: boolean;
    created_at: string;
}

export interface SearchResult {
    id: string;
    circular_id: string;
    title: string;
    content: string;
    score: number;
    metadata: {
        date: string;
        category: string;
        url?: string;
    };
}

export interface SearchResponse {
    query: string;
    results: SearchResult[];
    count: number;
}

export interface Teacher {
    id: string;
    name: string;
    email: string;
    phone?: string;
    subjects?: string[];
    grades?: string[];
    notification_channels: string[];
    created_at: string;
}

export interface StatsResponse {
    teachers: number;
    circulars: number;
    processed_circulars: number;
    pinecone_vectors: number;
}

// ── Generic Fetch Wrapper ─────────────────────────────────────────────────────

async function videoAgentFetch<T = any>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const { headers = {}, ...rest } = options;
    const res = await fetch(`${VIDEO_AGENT_BASE_URL}${path}`, {
        ...rest,
        headers: {
            'Content-Type': 'application/json',
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

// ── API Definition ────────────────────────────────────────────────────────────

export const videoAgentApi = {
    // LiveKit
    getLiveKitToken: (participant: string, teacherId?: string) => {
        const params = new URLSearchParams({ participant });
        if (teacherId) params.append('teacher_id', teacherId);
        return videoAgentFetch<LiveKitTokenResponse>(`/api/get-token?${params}`);
    },

    // Circulars
    listCirculars: (limit = 20, category?: string) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (category) params.append('category', category);
        return videoAgentFetch<Circular[]>(`/api/circulars?${params}`);
    },

    getCircular: (circularId: string) =>
        videoAgentFetch<Circular>(`/api/circulars/${circularId}`),

    uploadCircular: async (formData: FormData) => {
        const res = await fetch(`${VIDEO_AGENT_BASE_URL}/api/circulars/upload`, {
            method: 'POST',
            body: formData, // Browser handles boundary for FormData
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.detail || `Upload failed with status ${res.status}`);
        }

        return res.json() as Promise<{
            message: string;
            circular_id: string;
            files_processed: number;
            chunks_created: number;
        }>;
    },

    deleteCircular: (circularId: string) =>
        videoAgentFetch(`/api/circulars/${circularId}`, { method: 'DELETE' }),

    // Search
    searchCirculars: (query: string, category?: string, limit = 5) => {
        const params = new URLSearchParams({ query, limit: String(limit) });
        if (category) params.append('category', category);
        return videoAgentFetch<SearchResponse>(`/api/search?${params}`);
    },

    // Teachers
    registerTeacher: (teacherData: Partial<Teacher>) =>
        videoAgentFetch<Teacher>('/api/teachers/register', {
            method: 'POST',
            body: JSON.stringify(teacherData),
        }),

    listTeachers: () =>
        videoAgentFetch<Teacher[]>('/api/teachers'),

    // Stats
    getStats: () =>
        videoAgentFetch<StatsResponse>('/api/stats'),
};
