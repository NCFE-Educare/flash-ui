import { Platform } from 'react-native';
import { BASE_URL } from './api';

export interface LessonPlanResponse {
    lesson_plan: string;
}

export const lessonService = {
    generate: async (token: string, grade: string, topic: string, criteria: string, fileAsset?: any): Promise<LessonPlanResponse> => {
        const formData = new FormData();
        formData.append('grade', grade);
        formData.append('topic', topic);
        formData.append('criteria', criteria);

        if (fileAsset) {
            if (Platform.OS === 'web') {
                // In expo-document-picker on web, fileAsset might be a File object or contain one
                const file = fileAsset.file || fileAsset;
                formData.append('file', file);
            } else {
                // Native requires the special object
                formData.append('file', {
                    uri: fileAsset.uri,
                    type: fileAsset.mimeType || 'application/pdf',
                    name: fileAsset.name || 'document.pdf',
                } as any);
            }
        }

        const response = await fetch(`${BASE_URL}/lesson-plan/generate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                // Do NOT set Content-Type for FormData
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        return response.json();
    },
};
