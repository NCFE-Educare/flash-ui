// Semantic Light Theme
export const LightColors = {
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    primaryLight: '#A78BFA',
    primaryBg: '#F5F3FF',

    background: '#ffffff',
    surface: '#ffffff',
    surfaceSecondary: '#F9FAFB',
    surfaceHover: '#F3F4F6',

    border: '#E5E7EB',
    borderDark: '#D1D5DB',

    text: '#111827',
    textMuted: '#6B7280',
    textSubtle: '#9CA3AF',
    textInverse: '#ffffff',

    inputBg: '#F9FAFB',
    error: '#DC2626',
    errorBg: '#FEE2E2',

    // Keeping original names for backward compatibility briefly if needed, 
    // but semantic should be preferred.
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray700: '#374151',
    black: '#111827',
    dark: '#111827',
};

// Semantic Dark Theme
export const DarkColors = {
    primary: '#A78BFA',
    primaryDark: '#8B5CF6',
    primaryLight: '#C4B5FD',
    primaryBg: 'rgba(167, 139, 250, 0.15)',

    background: '#000000',
    surface: '#0A0A0A',
    surfaceSecondary: '#121212',
    surfaceHover: '#1E1E1E',

    border: '#262626',
    borderDark: '#333333',

    text: '#F9FAFB',
    textMuted: '#A3A3A3',
    textSubtle: '#737373',
    textInverse: '#000000',

    inputBg: '#121212',
    error: '#EF4444',
    errorBg: 'rgba(239, 68, 68, 0.15)',

    gray50: '#121212',
    gray100: '#1E1E1E',
    gray200: '#262626',
    gray400: '#737373',
    gray500: '#A3A3A3',
    gray700: '#D4D4D4',
    black: '#FFFFFF', // invert 'black' to 'white' for legacy usage
    dark: '#FFFFFF',
};

// Default export still needed for non-themed contexts (temporarily)
export const Colors = LightColors;

export const Fonts = {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',

    // IBM Plex Serif (Perplexity look)
    serif: 'IBMPlexSerif_400Regular',
    serifMedium: 'IBMPlexSerif_500Medium',
    serifSemibold: 'IBMPlexSerif_600SemiBold',
    serifBold: 'IBMPlexSerif_700Bold',
};
