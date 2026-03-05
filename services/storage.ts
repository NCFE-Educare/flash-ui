/**
 * Token storage utility.
 * Uses expo-secure-store on native (iOS/Android) and localStorage on web.
 */
import { Platform } from 'react-native';

const TOKEN_KEY = 'cortex_jwt';

async function nativeSet(value: string): Promise<void> {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(TOKEN_KEY, value);
}

async function nativeGet(): Promise<string | null> {
    const SecureStore = await import('expo-secure-store');
    return SecureStore.getItemAsync(TOKEN_KEY);
}

async function nativeDelete(): Promise<void> {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export const storage = {
    saveToken: async (token: string): Promise<void> => {
        if (Platform.OS === 'web') {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            await nativeSet(token);
        }
    },

    getToken: async (): Promise<string | null> => {
        if (Platform.OS === 'web') {
            return localStorage.getItem(TOKEN_KEY);
        }
        return nativeGet();
    },

    clearToken: async (): Promise<void> => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(TOKEN_KEY);
        } else {
            await nativeDelete();
        }
    },
};
