import React, { useState } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    Text,
    StyleSheet,
    Platform,
    Image,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Fonts } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../context/ThemeContext';
import { fileApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface ChatInputAreaProps {
    onSend(text: string, imageUrls?: string[]): void;
}

export default function ChatInputArea({ onSend }: ChatInputAreaProps) {
    const r = useResponsive();
    const { colors } = useTheme();
    const { token } = useAuth();

    const [text, setText] = useState('');
    const [selectedImages, setSelectedImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const hasText = text.trim().length > 0;
    const canSend = hasText || selectedImages.length > 0;

    // Horizontal padding adapts to screen size
    const hPad = r.isDesktop ? 100 : r.isTablet ? 40 : 12;

    const handlePickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
        }
    };

    const handleSend = async () => {
        if (!canSend || isUploading) return;

        let uploadedUrls: string[] | undefined;

        if (selectedImages.length > 0 && token) {
            setIsUploading(true);
            try {
                const res = await fileApi.upload(token, selectedImages);
                uploadedUrls = res.image_urls;
            } catch (err: any) {
                Alert.alert('Upload failed', err.message || 'Could not upload images');
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        onSend(text.trim(), uploadedUrls);
        setText('');
        setSelectedImages([]);
    };

    // ── Handle Web Paste Events ──
    React.useEffect(() => {
        if (Platform.OS !== 'web') return;

        const handlePaste = (e: any) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            let addedImgs: string[] = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        const url = URL.createObjectURL(file);
                        addedImgs.push(url);
                    }
                }
            }
            if (addedImgs.length > 0) {
                setSelectedImages(prev => [...prev, ...addedImgs]);
                e.preventDefault();
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const removeImage = (index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    };

    const s = getStyles(colors);

    return (
        <View style={[s.wrapper, { paddingHorizontal: hPad }]}>
            {/* Main input box */}
            <View style={s.container}>
                {selectedImages.length > 0 && (
                    <View style={s.previewContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                            {selectedImages.map((uri, index) => (
                                <View key={index} style={{ position: 'relative' }}>
                                    <Image source={{ uri }} style={s.previewImage} />
                                    <TouchableOpacity
                                        style={s.removeImageBtn}
                                        onPress={() => removeImage(index)}
                                        disabled={isUploading}
                                    >
                                        <Ionicons name="close" size={14} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <TextInput
                    style={s.input}
                    placeholder="Ask me anything..."
                    placeholderTextColor={colors.textSubtle}
                    value={text}
                    onChangeText={setText}
                    multiline
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    blurOnSubmit
                    editable={!isUploading}
                />

                {/* Toolbar row 1: chips + send */}
                <View style={s.toolbar1}>
                    <ModeChip icon="sparkles-outline" label={r.isMobile ? 'Research' : 'Deeper Research'} active colors={colors} />
                    {!r.isMobile && (
                        <TouchableOpacity style={s.toolbarBtn} activeOpacity={0.7} onPress={handlePickImage} disabled={isUploading}>
                            <Ionicons name="image-outline" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                    {!r.isMobile && <ToolbarBtn icon="bulb-outline" colors={colors} />}
                    <View style={{ flex: 1 }} />
                    {r.isDesktop && <ToolbarBtn icon="grid-outline" colors={colors} />}
                    {r.isDesktop && <ToolbarBtn icon="globe-outline" colors={colors} />}
                    <View style={{ width: 6 }} />
                    {/* Send button */}
                    <TouchableOpacity onPress={handleSend} activeOpacity={0.85} disabled={isUploading || !canSend}>
                        {isUploading ? (
                            <View style={[s.sendBtn, { backgroundColor: colors.surfaceHover }]}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                        ) : canSend ? (
                            <LinearGradient colors={[colors.primary, colors.primaryLight]} style={s.sendBtn}>
                                <Ionicons name="arrow-up" size={16} color="#fff" />
                            </LinearGradient>
                        ) : (
                            <View style={[s.sendBtn, { backgroundColor: colors.surfaceHover }]}>
                                <Ionicons name="arrow-up" size={16} color={colors.textSubtle} />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Toolbar row 2: saved prompts + attach (hidden on small mobile) */}
                {!r.isMobile && (
                    <View style={s.toolbar2}>
                        <Ionicons name="sparkles" size={13} color={colors.primary} />
                        <Text style={s.savedText}>Chat with Documents</Text>
                        <View style={{ flex: 1 }} />
                        <Ionicons name="attach-outline" size={13} color={colors.textMuted} />
                        <Text style={s.attachText}>Attach file</Text>
                    </View>
                )}
            </View>

            {/* Footer (desktop only) */}
            {r.isDesktop && (
                <View style={s.footer}>
                    <Text style={s.footerText}>
                        Join the valerius community for more insights{' '}
                        <Text style={s.discordLink}>Join Discord</Text>
                    </Text>
                    <View style={{ flexDirection: 'row' }}>
                        <ToolbarBtn icon="language-outline" colors={colors} />
                        <ToolbarBtn icon="help-circle-outline" colors={colors} />
                    </View>
                </View>
            )}
        </View>
    );
}

function ModeChip({ icon, label, active, colors }: { icon: string; label: string; active?: boolean, colors: any }) {
    const s = getStyles(colors);
    return (
        <View style={[s.chip, active && s.chipActive]}>
            <Ionicons name={icon as any} size={12} color={active ? colors.primary : colors.textMuted} />
            <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
        </View>
    );
}

function ToolbarBtn({ icon, colors }: { icon: string, colors: any }) {
    const s = getStyles(colors);
    return (
        <TouchableOpacity style={s.toolbarBtn} activeOpacity={0.7}>
            <Ionicons name={icon as any} size={16} color={colors.textMuted} />
        </TouchableOpacity>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    wrapper: {
        backgroundColor: colors.background,
        paddingTop: 0,
        paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    },
    container: {
        borderWidth: 1,
        borderColor: colors.borderDark,
        borderRadius: 16,
        backgroundColor: colors.surface,
        overflow: 'hidden',
    },
    input: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        fontSize: 14,
        fontFamily: Fonts.regular,
        color: colors.text,
        minHeight: 46,
        maxHeight: 140,
        // @ts-ignore – web only
        outlineWidth: 0,
    },
    toolbar1: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 2,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
    chipText: { fontSize: 12, fontFamily: Fonts.medium, color: colors.textMuted },
    chipTextActive: { color: colors.primary },
    toolbarBtn: { padding: 5 },
    sendBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    toolbar2: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: colors.surfaceSecondary,
        borderTopWidth: 1,
        borderTopColor: colors.borderDark,
        gap: 5,
    },
    savedText: { fontSize: 12, fontFamily: Fonts.medium, color: colors.textMuted },
    attachText: { fontSize: 12, fontFamily: Fonts.regular, color: colors.textSubtle },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingHorizontal: 4,
    },
    footerText: { flex: 1, fontSize: 12, fontFamily: Fonts.regular, color: colors.textSubtle },
    discordLink: { color: colors.primary, fontFamily: Fonts.medium, textDecorationLine: 'underline' },
    previewContainer: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.borderDark, position: 'relative', alignSelf: 'flex-start' },
    previewImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: colors.surfaceSecondary },
    removeImageBtn: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
});
