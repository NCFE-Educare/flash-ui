import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    ActivityIndicator,
    ScrollView,
    Platform,
    Share,
    Alert
} from 'react-native';
import { 
    MessageSquareQuote, 
    Sparkles, 
    ChevronLeft, 
    Copy, 
    Share2, 
    RefreshCw,
    Palette,
    Type
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { quoteService } from '../services/quoteService';
import { storage } from '../services/storage';
import * as Clipboard from 'expo-clipboard';

interface QuoteBuilderAppProps {
    onBack: () => void;
}

export default function QuoteBuilderApp({ onBack }: QuoteBuilderAppProps) {
    const { colors } = useTheme();
    const [topic, setTopic] = useState('');
    const [mood, setMood] = useState('');
    const [quote, setQuote] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [usedParams, setUsedParams] = useState({ topic: '', mood: '' });

    const handleGenerate = async (useLastParams = false) => {
        const targetTopic = useLastParams ? usedParams.topic : topic;
        const targetMood = useLastParams ? usedParams.mood : mood;

        setLoading(true);
        try {
            const token = await storage.getToken();
            if (!token) {
                Alert.alert('Error', 'No authentication token found. Please log in again.');
                return;
            }
            const response = await quoteService.generate(token, targetTopic, targetMood);
            setQuote(response.quote);
            setUsedParams({ topic: targetTopic, mood: targetMood });
        } catch (error: any) {
            console.error('Failed to generate quote:', error);
            Alert.alert('Error', error.message || 'Failed to generate quote');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (quote) {
            await Clipboard.setStringAsync(quote);
            // Optionally show a toast
        }
    };

    const handleShare = async () => {
        if (quote) {
            try {
                await Share.share({
                    message: quote,
                });
            } catch (error) {
                console.error(error);
            }
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.surfaceHover }]}>
                    <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Quote Builder</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Intro Card */}
                <LinearGradient
                    colors={[colors.primary + '20', 'transparent']}
                    style={styles.introCard}
                >
                    <View style={[styles.iconContainer, { backgroundColor: colors.primary + '30' }]}>
                        <MessageSquareQuote size={32} color={colors.primary} />
                    </View>
                    <Text style={[styles.introTitle, { color: colors.text }]}>AI Inspiration Engine</Text>
                    <Text style={[styles.introSubtitle, { color: colors.textSubtle }]}>
                        Generate premium two-liners for your school boards or social media.
                    </Text>
                </LinearGradient>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelContainer}>
                            <Type size={14} color={colors.textSubtle} />
                            <Text style={[styles.inputLabel, { color: colors.textSubtle }]}>TOPIC</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
                            placeholder="e.g. Resilience, Growth, Kindness"
                            placeholderTextColor={colors.textMuted}
                            value={topic}
                            onChangeText={setTopic}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelContainer}>
                            <Palette size={14} color={colors.textSubtle} />
                            <Text style={[styles.inputLabel, { color: colors.textSubtle }]}>MOOD</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
                            placeholder="e.g. Inspiring, Professional, Funny"
                            placeholderTextColor={colors.textMuted}
                            value={mood}
                            onChangeText={setMood}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.generateButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleGenerate(false)}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Sparkles size={18} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.generateButtonText}>Generate Quote</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Result Area */}
                {quote && (
                    <View style={styles.resultContainer}>
                        <LinearGradient
                            colors={[colors.surface, colors.surfaceHover]}
                            style={[styles.quoteCard, { borderColor: colors.border, borderWidth: 1 }]}
                        >
                            <Sparkles size={24} color={colors.primary} style={styles.sparkleIcon} />
                            <Text style={[styles.quoteText, { color: colors.text }]}>"{quote}"</Text>
                            
                            <View style={styles.actionRow}>
                                <TouchableOpacity onPress={copyToClipboard} style={styles.actionButton}>
                                    <Copy size={18} color={colors.textSubtle} />
                                    <Text style={[styles.actionText, { color: colors.textSubtle }]}>Copy</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                                    <Share2 size={18} color={colors.textSubtle} />
                                    <Text style={[styles.actionText, { color: colors.textSubtle }]}>Share</Text>
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => handleGenerate(true)} style={styles.actionButton}>
                                    <RefreshCw size={18} color={colors.textSubtle} />
                                    <Text style={[styles.actionText, { color: colors.textSubtle }]}>Regen</Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    introCard: {
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    introTitle: {
        fontSize: 22,
        fontFamily: Fonts.bold,
        marginBottom: 8,
    },
    introSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        fontFamily: Fonts.regular,
    },
    form: {
        gap: 20,
        marginBottom: 32,
    },
    inputGroup: {
        gap: 8,
    },
    inputLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginLeft: 4,
    },
    inputLabel: {
        fontSize: 11,
        fontFamily: Fonts.bold,
        letterSpacing: 1,
    },
    input: {
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 15,
        fontFamily: Fonts.regular,
    },
    generateButton: {
        height: 56,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        ...Platform.select({
            web: {
                cursor: 'pointer',
            }
        })
    },
    generateButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    resultContainer: {
        marginTop: 8,
    },
    quoteCard: {
        borderRadius: 24,
        padding: 32,
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    sparkleIcon: {
        position: 'absolute',
        top: 20,
        right: 20,
        opacity: 0.5,
    },
    quoteText: {
        fontSize: 20,
        fontFamily: Fonts.serif,
        textAlign: 'center',
        lineHeight: 30,
        marginBottom: 24,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 24,
        width: '100%',
        justifyContent: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
    },
    actionText: {
        fontSize: 13,
        fontFamily: Fonts.semibold,
    }
});
