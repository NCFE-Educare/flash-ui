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
    Alert
} from 'react-native';
import { 
    BookOpen, 
    Sparkles, 
    ChevronLeft, 
    FileUp, 
    X,
    FileText,
    GraduationCap,
    PenTool,
    Download
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { lessonService } from '../services/lessonService';
import { storage } from '../services/storage';
import { exportLessonPlanToPDF } from '../services/exportService';
import * as DocumentPicker from 'expo-document-picker';
import Markdown from 'react-native-markdown-display';

interface LessonPlannerAppProps {
    onBack: () => void;
}

export default function LessonPlannerApp({ onBack }: LessonPlannerAppProps) {
    const { colors } = useTheme();
    const [grade, setGrade] = useState('');
    const [topic, setTopic] = useState('');
    const [criteria, setCriteria] = useState('');
    const [fileAsset, setFileAsset] = useState<any>(null);
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [usedParams, setUsedParams] = useState({ grade: '', topic: '', criteria: '', fileAsset: null as any });

    const handlePickDocument = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
                copyToCacheDirectory: true,
            });

            if (!res.canceled) {
                setFileAsset(res.assets[0]);
            }
        } catch (err) {
            console.error('Pick document error:', err);
        }
    };

    const handleGenerate = async (useLastParams = false) => {
        const targetGrade = useLastParams ? usedParams.grade : grade;
        const targetTopic = useLastParams ? usedParams.topic : topic;
        const targetCriteria = useLastParams ? usedParams.criteria : criteria;
        const targetFile = useLastParams ? usedParams.fileAsset : fileAsset;

        if (!targetGrade || !targetTopic || !targetCriteria) {
            Alert.alert('Missing Info', 'Please fill in Grade, Topic, and Criteria.');
            return;
        }

        setLoading(true);
        try {
            const token = await storage.getToken();
            if (!token) {
                Alert.alert('Error', 'No authentication token found. Please log in again.');
                return;
            }
            const response = await lessonService.generate(token, targetGrade, targetTopic, targetCriteria, targetFile);
            setResult(response.lesson_plan);
            setUsedParams({ grade: targetGrade, topic: targetTopic, criteria: targetCriteria, fileAsset: targetFile });
        } catch (error: any) {
            console.error('Failed to generate lesson plan:', error);
            Alert.alert('Error', error.message || 'Failed to generate lesson plan');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!result) return;
        try {
            await exportLessonPlanToPDF(result, topic, grade);
        } catch (error) {
            Alert.alert('Export Error', 'Failed to generate PDF. Please try again.');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: colors.surfaceHover }]}>
                    <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Lesson Planner</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Intro Card */}
                {!result && (
                    <LinearGradient
                        colors={[colors.primary + '20', 'transparent']}
                        style={styles.introCard}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '30' }]}>
                            <BookOpen size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.introTitle, { color: colors.text }]}>AI Lesson Architect</Text>
                        <Text style={[styles.introSubtitle, { color: colors.textSubtle }]}>
                            Generate professional, structured lesson plans with AI. Upload your notes for context.
                        </Text>
                    </LinearGradient>
                )}

                {/* Form */}
                {!result && (
                    <View style={styles.form}>
                        <View style={styles.row}>
                             <View style={[styles.inputGroup, { flex: 1 }]}>
                                <View style={styles.inputLabelContainer}>
                                    <GraduationCap size={14} color={colors.textSubtle} />
                                    <Text style={[styles.inputLabel, { color: colors.textSubtle }]}>GRADE</Text>
                                </View>
                                <TextInput
                                    style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
                                    placeholder="e.g. 7th Grade"
                                    placeholderTextColor={colors.textMuted}
                                    value={grade}
                                    onChangeText={setGrade}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputLabelContainer}>
                                <FileText size={14} color={colors.textSubtle} />
                                <Text style={[styles.inputLabel, { color: colors.textSubtle }]}>TOPIC</Text>
                            </View>
                            <TextInput
                                style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
                                placeholder="e.g. Photosynthesis, Ancient Rome"
                                placeholderTextColor={colors.textMuted}
                                value={topic}
                                onChangeText={setTopic}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <View style={styles.inputLabelContainer}>
                                <PenTool size={14} color={colors.textSubtle} />
                                <Text style={[styles.inputLabel, { color: colors.textSubtle }]}>CRITERIA</Text>
                            </View>
                            <TextInput
                                style={[styles.textarea, { color: colors.text, backgroundColor: colors.surfaceHover, borderColor: colors.border }]}
                                placeholder="What should be included? (e.g. Focus on vocabulary, add a 10 min activity)"
                                placeholderTextColor={colors.textMuted}
                                multiline
                                numberOfLines={4}
                                value={criteria}
                                onChangeText={setCriteria}
                            />
                        </View>

                        {/* File Upload */}
                        <TouchableOpacity 
                            onPress={handlePickDocument} 
                            style={[styles.uploadButton, { borderColor: fileAsset ? colors.primary : colors.border, backgroundColor: fileAsset ? colors.primary + '10' : 'transparent' }]}
                        >
                            {fileAsset ? (
                                <View style={styles.fileInfo}>
                                    <FileText size={20} color={colors.primary} />
                                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{fileAsset.name}</Text>
                                    <TouchableOpacity onPress={() => setFileAsset(null)}>
                                        <X size={18} color={colors.textSubtle} />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <FileUp size={20} color={colors.textSubtle} />
                                    <Text style={[styles.uploadText, { color: colors.textSubtle }]}>Attach Reference (PDF, Docx, Txt)</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.generateButton, { backgroundColor: colors.primary }]}
                            onPress={() => handleGenerate(false)}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <ActivityIndicator color="#FFF" style={{ marginRight: 10 }} />
                                    <Text style={styles.generateButtonText}>Writing your plan...</Text>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} color="#FFF" style={{ marginRight: 8 }} />
                                    <Text style={styles.generateButtonText}>Generate Lesson Plan</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Result Area */}
                {result && (
                    <View style={styles.resultContainer}>
                         <View style={styles.resultActions}>
                            <TouchableOpacity onPress={() => setResult(null)} style={[styles.actionBtn, { backgroundColor: colors.surfaceHover }]}>
                                <X size={20} color={colors.text} />
                                <Text style={[styles.actionBtnText, { color: colors.text }]}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleDownloadPDF} style={[styles.actionBtn, { backgroundColor: colors.surfaceHover }]}>
                                <Download size={20} color={colors.text} />
                                <Text style={[styles.actionBtnText, { color: colors.text }]}>Download PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleGenerate(true)} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                                <Sparkles size={18} color="#FFF" />
                                <Text style={[styles.actionBtnText, { color: "#FFF" }]}>Regen</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.markdownContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                            <Markdown style={markdownStyles(colors)}>
                                {result}
                            </Markdown>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const markdownStyles = (colors: any) => ({
    body: {
        color: colors.text,
        fontFamily: Fonts.regular,
        fontSize: 15,
        lineHeight: 24,
    },
    heading1: {
        color: colors.text,
        fontFamily: Fonts.bold,
        fontSize: 28,
        marginVertical: 10,
    },
    heading2: {
        color: colors.text,
        fontFamily: Fonts.bold,
        fontSize: 22,
        marginVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 4,
    },
    heading3: {
        color: colors.text,
        fontFamily: Fonts.semibold,
        fontSize: 18,
        marginVertical: 6,
    },
    paragraph: {
        marginVertical: 8,
    },
    list_item: {
        marginVertical: 4,
    },
    strong: {
        fontFamily: Fonts.bold,
    },
    code_inline: {
        backgroundColor: colors.surfaceHover,
        color: colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        paddingHorizontal: 4,
        borderRadius: 4,
    },
});

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
    },
    row: {
        flexDirection: 'row',
        gap: 16,
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
    textarea: {
        height: 120,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        fontSize: 15,
        fontFamily: Fonts.regular,
        textAlignVertical: 'top',
    },
    uploadButton: {
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    uploadText: {
        fontSize: 14,
        fontFamily: Fonts.medium,
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        width: '100%',
    },
    fileName: {
        flex: 1,
        fontSize: 14,
        fontFamily: Fonts.semibold,
    },
    generateButton: {
        height: 56,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    generateButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    resultContainer: {
        marginTop: 0,
    },
    resultActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    actionBtnText: {
        fontSize: 14,
        fontFamily: Fonts.bold,
    },
    markdownContainer: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
    }
});
