import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors } from '../constants/theme';
import { storage } from '../services/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
    mode: ThemeMode;
    isDark: boolean;
    colors: typeof LightColors;
    setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'cortex_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const systemColorScheme = useColorScheme();
    const [mode, setModeState] = useState<ThemeMode>('system');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        async function loadTheme() {
            // Use standard localStorage directly on web to avoid async storage flicker if possible
            try {
                if (typeof localStorage !== 'undefined') {
                    const m = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
                    if (m === 'light' || m === 'dark' || m === 'system') {
                        setModeState(m);
                        setIsLoaded(true);
                        return;
                    }
                }

                // Native fallback (we'll just use system by default here to avoid flicker)
            } catch (e) { }
            setIsLoaded(true);
        }
        loadTheme();
    }, []);

    const setMode = async (newMode: ThemeMode) => {
        setModeState(newMode);
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(THEME_STORAGE_KEY, newMode);
        }
    };

    const isDark = mode === 'system' ? systemColorScheme === 'dark' : mode === 'dark';
    const colors = isDark ? DarkColors : LightColors;

    // Render children immediately, default to system if not loaded
    return (
        <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
