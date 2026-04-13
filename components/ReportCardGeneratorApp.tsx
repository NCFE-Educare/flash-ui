import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    Platform,
    Alert,
    Modal,
} from 'react-native';
import {
    ChevronLeft,
    GraduationCap,
    History,
    Plus,
    Save,
    Trash2,
    Eye,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Circle,
    Info,
    Calendar,
    User,
    Phone,
    BookOpen,
    Zap,
    Download
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { reportCardService, ReportCardInput, ReportCardSummary, ReportCardDetail } from '../services/reportCardService';
import { WebView } from 'react-native-webview';

const STATUS_OPTIONS: ("Completely Developed" | "Partially Developed" | "Emerging")[] = [
    "Completely Developed",
    "Partially Developed",
    "Emerging"
];

const DEFAULT_DOMAINS = {
    "Gross Motor Development": [
        "Walks backward", "Walks downstairs", "Swings", "Climbs", "Throws ball",
        "Catches ball", "Jumps forward", "Bounces large ball", "Jumps inside hula-hoop"
    ],
    "Fine Motor Development": [
        "Builds tower", "Finger plays", "Tearing", "Sticking/pasting", "Scribbling",
        "Dresses self", "Velcro straps", "Traces letters"
    ],
    "Language / Communication": [
        "Says name", "Points to pictures", "Talks to self", "Understands no/not/don't",
        "Enjoys story books", "Action words", "Picture books", "Verbalizes wants",
        "Simple directions", "Rhymes/songs", "Simple questions", "Identifies objects", "Places objects"
    ],
    "Expressive Language": [
        "Eye contact", "Communicate ideas", "Converse with peers/adults",
        "Simple sentences", "Asks why/what/when/where/how"
    ],
    "Cognitive Abilities": [
        "Able to identify different seasons", "Identifies healthy and unhealthy food",
        "Able to tell name of community helpers", "Matches 3 colours",
        "Identifies different vehicles", "Identifies and classifies fruits and vegetables",
        "Identifies safe and unsafe objects", "A sense of happiness and motivation in learning"
    ],
    "Pre-Mathematical Abilities": [
        "Tall/short concepts", "Numbers with quantity", "Shapes and colors"
    ],
    "Creativity / Curiosity": [
        "Displays curiosity", "Asks questions about why things happen"
    ],
    "Social Emotional Development": [
        "Separates from mother", "Watches/joins play", "Defends possessions",
        "Puts toys away", "Independence", "cleanliness"
    ],
    "Expression of Feelings": [
        "Array of feelings", "Describing feelings"
    ]
};

interface ReportCardGeneratorAppProps {
    onBack: () => void;
}

type ViewMode = 'CREATE' | 'HISTORY' | 'PREVIEW';

export default function ReportCardGeneratorApp({ onBack }: ReportCardGeneratorAppProps) {
    const { colors, isDark } = useTheme();
    const { token } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>('CREATE');
    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState<ReportCardSummary[]>([]);
    const [selectedReport, setSelectedReport] = useState<ReportCardDetail | null>(null);

    // Form State
    const [studentDetails, setStudentDetails] = useState({
        name: '',
        grade: 'Pre-Primary',
        term: 'Term 2',
        teacher: '',
        parent_name: '',
        parent_phone: ''
    });

    const [domainData, setDomainData] = useState<Record<string, { indicators: { name: string, status: any }[], remark: string }>>(() => {
        const initial: any = {};
        Object.entries(DEFAULT_DOMAINS).forEach(([domain, indicators]) => {
            initial[domain] = {
                indicators: indicators.map(name => ({ name, status: 'Completely Developed' })),
                remark: ''
            };
        });
        return initial;
    });

    const [expandedDomain, setExpandedDomain] = useState<string | null>("Gross Motor Development");

    useEffect(() => {
        if (viewMode === 'HISTORY') {
            fetchReports();
        }
    }, [viewMode]);

    const fetchReports = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await reportCardService.list(token);
            setReports(data || []);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!token) return;
        if (!studentDetails.name || !studentDetails.teacher) {
            Alert.alert("Missing Info", "Please provide at least the student name and teacher name.");
            return;
        }

        setLoading(true);
        try {
            const payload: ReportCardInput = {
                student_details: studentDetails,
                domains: domainData
            };
            const result = await reportCardService.generate(token, payload);
            Alert.alert("Success", "Report card generated successfully!");
            setViewMode('HISTORY');
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewReport = async (id: number) => {
        if (!token) return;
        setLoading(true);
        try {
            const detail = await reportCardService.get(token, id);
            setSelectedReport(detail);
            setViewMode('PREVIEW');
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReport = async (id: number) => {
        if (!token) return;
        Alert.alert(
            "Delete Report",
            "Are you sure you want to delete this report card?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await reportCardService.delete(token, id);
                            fetchReports();
                        } catch (error: any) {
                            Alert.alert("Error", error.message);
                        }
                    }
                }
            ]
        );
    };

    const updateIndicatorStatus = (domain: string, index: number, status: any) => {
        setDomainData(prev => ({
            ...prev,
            [domain]: {
                ...prev[domain],
                indicators: prev[domain].indicators.map((ind, i) => i === index ? { ...ind, status } : ind)
            }
        }));
    };

    const updateDomainRemark = (domain: string, remark: string) => {
        setDomainData(prev => ({
            ...prev,
            [domain]: {
                ...prev[domain],
                remark
            }
        }));
    };

    const renderHeader = () => (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                <ChevronLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
                <GraduationCap size={20} color={colors.primary} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>Report Cards</Text>
            </View>
            <TouchableOpacity 
                onPress={() => setViewMode(viewMode === 'HISTORY' ? 'CREATE' : 'HISTORY')} 
                style={[styles.modeToggle, { backgroundColor: colors.surfaceHover }]}
            >
                {viewMode === 'HISTORY' ? (
                    <Plus size={18} color={colors.primary} />
                ) : (
                    <History size={18} color={colors.primary} />
                )}
            </TouchableOpacity>
        </View>
    );

    const renderCreateForm = () => (
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollPadding}>
            {/* Student Details Section */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                    <User size={18} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Student Details</Text>
                </View>

                <View style={styles.inputGrid}>
                    <View style={styles.inputWrap}>
                        <Text style={[styles.label, { color: colors.textSubtle }]}>Student Name</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                            placeholder="e.g. Aryan Sharma"
                            placeholderTextColor={colors.textSubtle}
                            value={studentDetails.name}
                            onChangeText={txt => setStudentDetails({ ...studentDetails, name: txt })}
                        />
                    </View>
                    <View style={styles.inputWrap}>
                        <Text style={[styles.label, { color: colors.textSubtle }]}>Teacher Name</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                            placeholder="e.g. Ms. Muthanna"
                            placeholderTextColor={colors.textSubtle}
                            value={studentDetails.teacher}
                            onChangeText={txt => setStudentDetails({ ...studentDetails, teacher: txt })}
                        />
                    </View>
                </View>

                <View style={styles.inputGrid}>
                    <View style={styles.inputWrap}>
                        <Text style={[styles.label, { color: colors.textSubtle }]}>Grade</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                            value={studentDetails.grade}
                            onChangeText={txt => setStudentDetails({ ...studentDetails, grade: txt })}
                        />
                    </View>
                    <View style={styles.inputWrap}>
                        <Text style={[styles.label, { color: colors.textSubtle }]}>Term</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                            value={studentDetails.term}
                            onChangeText={txt => setStudentDetails({ ...studentDetails, term: txt })}
                        />
                    </View>
                </View>

                <View style={styles.inputGrid}>
                    <View style={styles.inputWrap}>
                        <Text style={[styles.label, { color: colors.textSubtle }]}>Parent Name</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                            value={studentDetails.parent_name}
                            onChangeText={txt => setStudentDetails({ ...studentDetails, parent_name: txt })}
                        />
                    </View>
                    <View style={styles.inputWrap}>
                        <Text style={[styles.label, { color: colors.textSubtle }]}>Parent Phone</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                            value={studentDetails.parent_phone}
                            keyboardType="phone-pad"
                            onChangeText={txt => setStudentDetails({ ...studentDetails, parent_phone: txt })}
                        />
                    </View>
                </View>
            </View>

            {/* Domains Accordion */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ASSESSMENT DOMAINS</Text>
            
            {Object.entries(DEFAULT_DOMAINS).map(([domain, indicators]) => {
                const isExpanded = expandedDomain === domain;
                const data = domainData[domain];
                
                return (
                    <View key={domain} style={[styles.accordion, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <TouchableOpacity 
                            onPress={() => setExpandedDomain(isExpanded ? null : domain)}
                            style={styles.accordionHeader}
                        >
                            <View style={styles.accordionStatusIcon}>
                                <Zap size={16} color={isExpanded ? colors.primary : colors.textSubtle} />
                            </View>
                            <Text style={[styles.accordionTitle, { color: isExpanded ? colors.primary : colors.text }]}>{domain}</Text>
                            {isExpanded ? <ChevronUp size={20} color={colors.textSubtle} /> : <ChevronDown size={20} color={colors.textSubtle} />}
                        </TouchableOpacity>

                        {isExpanded && (
                            <View style={styles.accordionContent}>
                                {data.indicators.map((ind, idx) => (
                                    <View key={ind.name} style={[styles.indicatorRow, idx === 0 && { borderTopWidth: 0 }, { borderTopColor: colors.border }]}>
                                        <Text style={[styles.indicatorName, { color: colors.text }]}>{ind.name}</Text>
                                        <View style={styles.statusPicker}>
                                            {STATUS_OPTIONS.map(opt => (
                                                <TouchableOpacity 
                                                    key={opt}
                                                    onPress={() => updateIndicatorStatus(domain, idx, opt)}
                                                    style={[
                                                        styles.statusOption,
                                                        { borderColor: colors.border },
                                                        ind.status === opt && { backgroundColor: colors.primary, borderColor: colors.primary }
                                                    ]}
                                                >
                                                    <Text style={[
                                                        styles.statusOptionLabel, 
                                                        { color: colors.textSubtle },
                                                        ind.status === opt && { color: '#fff' }
                                                    ]}>
                                                        {opt === "Completely Developed" ? "Full" : opt === "Partially Developed" ? "Partial" : "Emerging"}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                                
                                <View style={styles.remarkWrap}>
                                    <Text style={[styles.label, { color: colors.textSubtle }]}>Domain Remarks</Text>
                                    <TextInput
                                        style={[styles.remarkInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                                        placeholder={`General remarks for ${domain}...`}
                                        placeholderTextColor={colors.textSubtle}
                                        multiline
                                        value={data.remark}
                                        onChangeText={txt => updateDomainRemark(domain, txt)}
                                    />
                                </View>
                            </View>
                        )}
                    </View>
                );
            })}

            <TouchableOpacity 
                onPress={handleGenerate} 
                style={styles.generateBtn}
                disabled={loading}
            >
                <LinearGradient
                    colors={[colors.primary, colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.generateGrad}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Zap size={18} color="#fff" />
                            <Text style={styles.generateText}>Generate Report Card</Text>
                        </>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderHistory = () => (
        <View style={styles.content}>
            {loading && reports.length === 0 ? (
                <View style={styles.centerLoading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : reports.length === 0 ? (
                <View style={styles.emptyState}>
                    <History size={48} color={colors.textSubtle} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No reports found</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textSubtle }]}>Generate your first report card to see it here.</Text>
                    <TouchableOpacity onPress={() => setViewMode('CREATE')} style={[styles.createNowBtn, { backgroundColor: colors.primary }]}>
                        <Text style={styles.createNowText}>Generate New</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.historyList}>
                    {reports.map(report => (
                        <TouchableOpacity 
                            key={report.id} 
                            style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => handleViewReport(report.id)}
                        >
                            <View style={styles.reportIcon}>
                                <GraduationCap size={24} color={colors.primary} />
                            </View>
                            <View style={styles.reportInfo}>
                                <Text style={[styles.reportStudent, { color: colors.text }]}>{report.student_name}</Text>
                                <Text style={[styles.reportMeta, { color: colors.textMuted }]}>{report.grade} • {report.term}</Text>
                                <Text style={[styles.reportDate, { color: colors.textSubtle }]}>{new Date(report.created_at).toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.reportActions}>
                                <TouchableOpacity onPress={() => handleDeleteReport(report.id)} style={styles.actionBtn}>
                                    <Trash2 size={18} color={colors.error} />
                                </TouchableOpacity>
                                <Eye size={18} color={colors.primary} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </View>
    );

    const renderPreview = () => (
        <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
                <TouchableOpacity onPress={() => setViewMode('HISTORY')} style={styles.previewBack}>
                    <ChevronLeft size={24} color={colors.text} />
                    <Text style={[styles.previewBackText, { color: colors.text }]}>Back to List</Text>
                </TouchableOpacity>
                <Text style={[styles.previewTitle, { color: colors.text }]}>Preview Report</Text>
                <View style={{ width: 40 }} />
            </View>
            
            {selectedReport && (
                <View style={{ flex: 1 }}>
                    {Platform.OS === 'web' ? (
                        <iframe 
                            srcDoc={selectedReport.generated_html} 
                            style={{ flex: 1, border: 'none', width: '100%', height: '100%', backgroundColor: '#fff' }} 
                            title="Report Card Preview"
                        />
                    ) : (
                        <WebView 
                            originWhitelist={['*']}
                            source={{ html: selectedReport.generated_html }}
                            style={{ flex: 1, backgroundColor: '#fff' }}
                        />
                    )}
                </View>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {viewMode !== 'PREVIEW' && renderHeader()}
            {viewMode === 'CREATE' ? renderCreateForm() : viewMode === 'HISTORY' ? renderHistory() : renderPreview()}
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
        height: 64,
        borderBottomWidth: 1,
    },
    backBtn: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
    modeToggle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
    },
    scrollPadding: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionLabel: {
        fontSize: 12,
        fontFamily: Fonts.bold,
        marginTop: 24,
        marginBottom: 12,
        letterSpacing: 1,
    },
    section: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: Fonts.semibold,
    },
    inputGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    inputWrap: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        fontFamily: Fonts.medium,
        marginBottom: 6,
    },
    input: {
        height: 44,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 14,
        fontFamily: Fonts.regular,
    },
    accordion: {
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 10,
        overflow: 'hidden',
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    accordionStatusIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    accordionTitle: {
        flex: 1,
        fontSize: 14,
        fontFamily: Fonts.semibold,
    },
    accordionContent: {
        padding: 16,
        paddingTop: 0,
    },
    indicatorRow: {
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    indicatorName: {
        fontSize: 14,
        fontFamily: Fonts.medium,
        marginBottom: 10,
    },
    statusPicker: {
        flexDirection: 'row',
        gap: 8,
    },
    statusOption: {
        flex: 1,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusOptionLabel: {
        fontSize: 11,
        fontFamily: Fonts.semibold,
    },
    remarkWrap: {
        marginTop: 16,
    },
    remarkInput: {
        height: 80,
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        fontSize: 13,
        fontFamily: Fonts.regular,
        textAlignVertical: 'top',
    },
    generateBtn: {
        marginTop: 24,
        borderRadius: 14,
        overflow: 'hidden',
    },
    generateGrad: {
        height: 54,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    generateText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    historyList: {
        padding: 20,
        gap: 12,
    },
    reportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    reportIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    reportInfo: {
        flex: 1,
    },
    reportStudent: {
        fontSize: 16,
        fontFamily: Fonts.semibold,
        marginBottom: 2,
    },
    reportMeta: {
        fontSize: 13,
        fontFamily: Fonts.medium,
        marginBottom: 4,
    },
    reportDate: {
        fontSize: 11,
        fontFamily: Fonts.regular,
    },
    reportActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    actionBtn: {
        padding: 4,
    },
    centerLoading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        fontFamily: Fonts.regular,
        textAlign: 'center',
        marginBottom: 24,
    },
    createNowBtn: {
        paddingHorizontal: 24,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createNowText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: Fonts.bold,
    },
    previewContainer: {
        flex: 1,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 64,
        borderBottomWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    previewBack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewBackText: {
        marginLeft: 4,
        fontSize: 14,
        fontFamily: Fonts.medium,
    },
    previewTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
    }
});
