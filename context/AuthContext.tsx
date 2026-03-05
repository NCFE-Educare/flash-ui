import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserInfo, authApi } from '../services/api';
import { storage } from '../services/storage';

interface AuthContextValue {
    token: string | null;
    user: UserInfo | null;
    loading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    // Load token on mount & fetch user
    useEffect(() => {
        async function initAuth() {
            try {
                const stored = await storage.getToken();
                if (stored) {
                    const u = await authApi.me(stored);
                    setToken(stored);
                    setUser(u);
                }
            } catch (err) {
                // Token invalid or expired
                await storage.clearToken();
            } finally {
                setLoading(false);
            }
        }
        initAuth();
    }, []);

    const login = async (newToken: string) => {
        await storage.saveToken(newToken);
        const u = await authApi.me(newToken);
        setToken(newToken);
        setUser(u);
    };

    const logout = async () => {
        await storage.clearToken();
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (ctx === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}
