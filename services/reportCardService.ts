import { BASE_URL } from './api';

export interface Indicator {
    name: string;
    status: "Completely Developed" | "Partially Developed" | "Emerging";
}

export interface DomainData {
    indicators: Indicator[];
    remark: string;
}

export interface StudentDetails {
    name: string;
    grade: string;
    term: string;
    teacher: string;
    parent_name: string;
    parent_phone: string;
}

export interface ReportCardInput {
    student_details: StudentDetails;
    domains: {
        [key: string]: DomainData;
    };
}

export interface ReportCardSummary {
    id: number;
    student_name: string;
    grade: string;
    term: string;
    teacher_name: string;
    created_at: string;
}

export interface ReportCardDetail extends ReportCardSummary {
    parent_name: string;
    parent_phone: string;
    input_data: string;
    generated_html: string;
}

export const reportCardService = {
    generate: async (token: string, data: ReportCardInput): Promise<{ id: number; generated_html: string }> => {
        const response = await fetch(`${BASE_URL}/report-cards/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        return response.json();
    },

    list: async (token: string): Promise<ReportCardSummary[]> => {
        const response = await fetch(`${BASE_URL}/report-cards`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        return response.json();
    },

    get: async (token: string, id: number): Promise<ReportCardDetail> => {
        const response = await fetch(`${BASE_URL}/report-cards/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        return response.json();
    },

    delete: async (token: string, id: number): Promise<void> => {
        const response = await fetch(`${BASE_URL}/report-cards/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }
    },
};
