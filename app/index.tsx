import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
    const r = useResponsive();
    const { login: setAuthContext } = useAuth();
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const passwordRef = useRef<TextInput>(null);

    const handleSubmit = async () => {
        if (!email || !password || (isSignUp && !username)) {
            setErrorMsg('Please fill in all fields');
            return;
        }

        setLoading(true);
        setErrorMsg('');
        try {
            if (isSignUp) {
                const res = await authApi.signup(email, username, password);
                await setAuthContext(res.access_token);
                router.replace('/chat');
            } else {
                const res = await authApi.login(email, password);
                await setAuthContext(res.access_token);
                router.replace('/chat');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const formProps = {
        isSignUp, email, username, password, showPassword, loading, errorMsg, colors, isDark,
        onEmailChange: setEmail,
        onUsernameChange: setUsername,
        onPasswordChange: setPassword,
        onTogglePassword: () => setShowPassword(v => !v),
        onToggleMode: () => {
            setIsSignUp(v => !v);
            setErrorMsg('');
        },
        onSubmit: handleSubmit,
        passwordRef,
    };

    const layoutStyles = getLayoutStyles(colors);

    // ── Desktop: side-by-side panels ─────────────────────────────────────────
    if (r.isDesktop) {
        return (
            <View style={layoutStyles.desktopRoot}>
                <LeftPanel large />
                <View style={[layoutStyles.rightPanel, { width: 480 }]}>
                    <LoginForm {...formProps} />
                </View>
            </View>
        );
    }

    // ── Tablet (iPad): same split but narrower right panel ────────────────────
    if (r.isTablet) {
        return (
            <View style={layoutStyles.desktopRoot}>
                <LeftPanel />
                <View style={[layoutStyles.rightPanel, { width: 380 }]}>
                    <LoginForm {...formProps} />
                </View>
            </View>
        );
    }

    // ── Mobile: stacked header + form ────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: isDark ? colors.background : '#F8F7FF' }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LinearGradient colors={[colors.primaryDark, colors.primaryLight]} style={layoutStyles.mobileHeader}>
                <View style={layoutStyles.logoRow}>
                    <Image source={require('../assets/logo.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                    <Text style={layoutStyles.logoText}>Cortex</Text>
                </View>
                <View style={{ alignItems: 'center', marginTop: 24 }}>
                    <Image source={require('../assets/logo.png')} style={{ width: 70, height: 70 }} resizeMode="contain" />
                </View>
                <Text style={[layoutStyles.tagline, { fontSize: 20, marginTop: 16, marginBottom: 0 }]}>
                    Your intelligent AI companion
                </Text>
            </LinearGradient>

            <ScrollView
                style={layoutStyles.mobileFormScroll}
                contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
            >
                <LoginForm {...formProps} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ── Left decorative panel ──────────────────────────────────────────────────
function LeftPanel({ large = false }: { large?: boolean }) {
    const { colors } = useTheme();
    const s = getLayoutStyles(colors);

    return (
        <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.primaryLight, 'rgba(167, 139, 250, 0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.leftPanel}
        >
            <View style={[s.deco, { top: -80, left: -80, width: 350, height: 350 }]} />
            <View style={[s.deco, { bottom: -100, right: -60, width: 400, height: 400 }]} />

            <View style={s.logoRow}>
                <Image source={require('../assets/logo.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                <Text style={s.logoText}>Cortex</Text>
            </View>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Image source={require('../assets/logo.png')} style={{ width: large ? 100 : 80, height: large ? 100 : 80 }} resizeMode="contain" />
                <Text style={[s.tagline, { marginTop: 28 }]}>Your intelligent AI companion</Text>
                <Text style={s.taglineSub}>
                    Ask anything, synthesize data, brainstorm{'\n'}ideas and get instant answers.
                </Text>
            </View>

            <View style={s.pillRow}>
                {[
                    { icon: 'analytics-outline', label: 'Synthesize Data' },
                    { icon: 'bulb-outline', label: 'Creative Brainstorm' },
                    { icon: 'checkmark-circle-outline', label: 'Check Facts' },
                    { icon: 'search-outline', label: 'Deeper Research' },
                ].map(p => (
                    <View key={p.label} style={s.pill}>
                        <Ionicons name={p.icon as any} size={13} color="#fff" />
                        <Text style={s.pillText}>{p.label}</Text>
                    </View>
                ))}
            </View>
        </LinearGradient>
    );
}

// ── Shared Login Form ─────────────────────────────────────────────────────────
interface LoginFormProps {
    isSignUp: boolean; email: string; username: string; password: string;
    showPassword: boolean; loading: boolean; errorMsg: string; colors: any; isDark: boolean;
    onEmailChange(v: string): void; onUsernameChange(v: string): void; onPasswordChange(v: string): void;
    onTogglePassword(): void; onToggleMode(): void; onSubmit(): void;
    passwordRef: React.RefObject<TextInput>;
}

function LoginForm({ isSignUp, email, username, password, showPassword, loading, errorMsg, colors, isDark,
    onEmailChange, onUsernameChange, onPasswordChange, onTogglePassword, onToggleMode, onSubmit, passwordRef }: LoginFormProps) {

    const form = getFormStyles(colors, isDark);

    return (
        <View style={form.wrap}>
            <Text style={form.title}>{isSignUp ? 'Create an account' : 'Welcome back'}</Text>
            <Text style={form.subtitle}>
                {isSignUp ? 'Join Cortex today to get started' : 'Sign in to your Cortex account'}
            </Text>

            {errorMsg ? (
                <View style={form.errorBox}>
                    <Text style={form.errorText}>{errorMsg}</Text>
                </View>
            ) : null}

            {isSignUp && (
                <>
                    <Text style={form.label}>Username</Text>
                    <View style={form.inputWrap}>
                        <Ionicons name="person-outline" size={17} color={colors.textSubtle} style={form.icon} />
                        <TextInput
                            style={form.input as any}
                            placeholder="e.g. john_doe"
                            placeholderTextColor={colors.textSubtle}
                            value={username}
                            onChangeText={onUsernameChange}
                            autoCapitalize="none"
                            returnKeyType="next"
                        />
                    </View>
                </>
            )}

            <Text style={[form.label, isSignUp && { marginTop: 16 }]}>Email address</Text>
            <View style={form.inputWrap}>
                <Ionicons name="mail-outline" size={17} color={colors.textSubtle} style={form.icon} />
                <TextInput
                    style={form.input as any}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textSubtle}
                    value={email}
                    onChangeText={onEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                />
            </View>

            <Text style={[form.label, { marginTop: 16 }]}>Password</Text>
            <View style={form.inputWrap}>
                <Ionicons name="lock-closed-outline" size={17} color={colors.textSubtle} style={form.icon} />
                <TextInput
                    ref={passwordRef}
                    style={[form.input, { flex: 1 }] as any}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textSubtle}
                    value={password}
                    onChangeText={onPasswordChange}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={onSubmit}
                />
                <TouchableOpacity onPress={onTogglePassword} style={form.eyeBtn}>
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={17} color={colors.textSubtle} />
                </TouchableOpacity>
            </View>

            {!isSignUp && (
                <TouchableOpacity style={form.forgot}>
                    <Text style={form.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity style={[form.signInBtn, isSignUp && { marginTop: 24 }]} onPress={onSubmit} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={[colors.primary, colors.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={form.signInGrad}>
                    {loading
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={form.signInText}>{isSignUp ? 'Sign up' : 'Sign in'}</Text>
                    }
                </LinearGradient>
            </TouchableOpacity>

            <View style={form.divRow}>
                <View style={form.line} />
                <Text style={form.orText}>or continue with</Text>
                <View style={form.line} />
            </View>

            <TouchableOpacity style={form.googleBtn} activeOpacity={0.8}>
                <View style={form.googleIcon}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#4285F4' }}>G</Text>
                </View>
                <Text style={form.googleText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={form.signUpRow}>
                <Text style={form.signUpGray}>
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                </Text>
                <TouchableOpacity onPress={onToggleMode}>
                    <Text style={form.signUpLink}>{isSignUp ? 'Sign in' : 'Sign up free'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ── Dynamic Styles Factory ──────────────────────────────────────────────────
const getLayoutStyles = (colors: any) => StyleSheet.create({
    desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
    leftPanel: { flex: 1, padding: 48, overflow: 'hidden', justifyContent: 'space-between' },
    rightPanel: { backgroundColor: colors.surface, justifyContent: 'center', padding: 48 },
    deco: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.07)' },
    logoRow: { flexDirection: 'row', alignItems: 'center' },
    logoBox: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    logoText: { marginLeft: 10, fontSize: 20, fontFamily: Fonts.bold, color: '#fff' },
    tagline: { fontSize: 22, fontFamily: Fonts.bold, color: '#fff', textAlign: 'center' },
    taglineSub: { fontSize: 15, fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 24, marginTop: 10 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    pillText: { fontSize: 12, color: '#fff', fontFamily: Fonts.medium },
    mobileHeader: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 48, paddingHorizontal: 24 },
    mobileFormScroll: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24 },
});

const getFormStyles = (colors: any, isDark: boolean) => StyleSheet.create({
    wrap: { width: '100%' },
    title: { fontSize: 26, fontFamily: Fonts.bold, color: colors.text, marginBottom: 6 },
    subtitle: { fontSize: 14, fontFamily: Fonts.regular, color: colors.textMuted, marginBottom: 26 },
    errorBox: { backgroundColor: colors.errorBg, padding: 12, borderRadius: 8, marginBottom: 16 },
    errorText: { color: colors.error, fontSize: 13, fontFamily: Fonts.medium },
    label: { fontSize: 13, fontFamily: Fonts.medium, color: colors.text, marginBottom: 7 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.inputBg, marginBottom: 4 },
    icon: { marginLeft: 14, marginRight: 4 },
    input: { flex: 1, height: 48, fontSize: 14, fontFamily: Fonts.regular, color: colors.text, paddingRight: 14, outlineWidth: 0 },
    eyeBtn: { padding: 12 },
    forgot: { alignSelf: 'flex-end', marginTop: 6, marginBottom: 20 },
    forgotText: { fontSize: 13, fontFamily: Fonts.medium, color: colors.primary },
    signInBtn: { borderRadius: 12, overflow: 'hidden' },
    signInGrad: { height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
    signInText: { fontSize: 15, fontFamily: Fonts.semibold, color: '#fff' },
    divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
    line: { flex: 1, height: 1, backgroundColor: colors.border },
    orText: { fontSize: 13, fontFamily: Fonts.regular, color: colors.textSubtle, marginHorizontal: 14 },
    googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 10, marginBottom: 28 },
    googleIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: isDark ? '#fff' : '#F1F5FE', alignItems: 'center', justifyContent: 'center' },
    googleText: { fontSize: 14, fontFamily: Fonts.medium, color: colors.text },
    signUpRow: { flexDirection: 'row', justifyContent: 'center' },
    signUpGray: { fontSize: 14, fontFamily: Fonts.regular, color: colors.textMuted },
    signUpLink: { fontSize: 14, fontFamily: Fonts.semibold, color: colors.primary },
});
