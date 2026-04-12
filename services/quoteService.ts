import { apiFetch } from './api';

export interface QuoteResponse {
    quote: string;
}

export const quoteService = {
    generate: (token: string, topic?: string | null, mood?: string | null) =>
        apiFetch<QuoteResponse>('/quote/generate', {
            method: 'POST',
            token,
            body: JSON.stringify({ 
                topic: topic || null, 
                mood: mood || null 
            }),
        }),
};
