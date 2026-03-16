import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { NotificationProvider } from '../context/NotificationContext';

SplashScreen.preventAutoHideAsync();

// Suppress browser focus outlines on web globally
if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
    input:focus, textarea:focus, select:focus, [contenteditable]:focus {
      outline: none !important;
      box-shadow: none !important;
    }
    * { -webkit-tap-highlight-color: transparent; }
  `;
    document.head.appendChild(style);
}

function InitialLayout() {
    const { token, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === 'index';

        if (!token && !inAuthGroup) {
            router.replace('/');
        } else if (token && inAuthGroup) {
            router.replace('/chat');
        }
    }, [token, loading, segments]);

    if (loading) return null;

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="chat" />
        </Stack>
    );
}

function ThemedApp() {
    const { isDark } = useTheme();
    return (
        <>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <InitialLayout />
        </>
    );
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    useEffect(() => {
        if (fontsLoaded) SplashScreen.hideAsync();
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
        <ThemeProvider>
            <AuthProvider>
                <NotificationProvider>
                    <ThemedApp />
                </NotificationProvider>
            </AuthProvider>
        </ThemeProvider>
    );
}
