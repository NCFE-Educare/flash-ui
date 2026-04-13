import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
  Image
} from 'react-native';
import { 
  Search,
  Plus,
  MessageSquareQuote,
  BookOpen,
  Calendar,
  FileEdit,
  Bell,
  Users,
  GraduationCap,
  ContactRound,
  Images
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/theme';
import BentoCard, { BentoSize } from './BentoCard';
import QuoteBuilderApp from './QuoteBuilderApp';
import LessonPlannerApp from './LessonPlannerApp';
import ReportCardGeneratorApp from './ReportCardGeneratorApp';

const CATEGORIES = ['All', 'Academics', 'Admin', 'Planning', 'Design', 'Communication'];

interface AppData {
  id: string;
  title: string;
  description: string;
  imageIcon?: any;
  fallbackIcon: any;
  category: string;
  color: string;
  size: BentoSize;
}

const APPS: AppData[] = [
  {
    id: '1',
    title: 'Quote Builder',
    description: 'Create and design inspirational quotes for school boards.',
    imageIcon: require('../assets/apps/quote_builder_icon_1775725528190.png'),
    fallbackIcon: MessageSquareQuote,
    category: 'Design',
    color: '#8B5CF6',
    size: 'small',
  },
  {
    id: '2',
    title: 'Lesson Planner',
    description: 'Structured planning tools for daily and weekly lessons.',
    imageIcon: require('../assets/apps/lesson_planner_icon_1775725541729.png'),
    fallbackIcon: BookOpen,
    category: 'Planning',
    color: '#10B981',
    size: 'small',
  },
  {
    id: '3',
    title: 'Exam Scheduler',
    description: 'Automated finals scheduling and tracking.',
    imageIcon: require('../assets/apps/exam_scheduler_icon_1775725556214.png'),
    fallbackIcon: Calendar,
    category: 'Academics',
    color: '#3B82F6',
    size: 'small',
  },
  {
    id: '4',
    title: 'Question Paper',
    description: 'AI-assisted paper generation and formatting.',
    imageIcon: require('../assets/apps/question_paper_icon_1775725579608.png'),
    fallbackIcon: FileEdit,
    category: 'Academics',
    color: '#F59E0B',
    size: 'small',
  },
  {
    id: '5',
    title: 'Circular Creation',
    description: 'Draft official notices for staff and students.',
    imageIcon: require('../assets/apps/circular_creation_icon_1775725594964.png'),
    fallbackIcon: Bell,
    category: 'Admin',
    color: '#EF4444',
    size: 'small',
  },
  {
    id: '6',
    title: 'Seating Plan',
    description: 'Generate exam seating arrangements instantly.',
    imageIcon: require('../assets/apps/seating_plan_icon_1775725610563.png'),
    fallbackIcon: Users,
    category: 'Admin',
    color: '#06B6D4',
    size: 'small',
  },
  {
    id: '7',
    title: 'Report Cards',
    description: 'Student performance tracking and reports.',
    imageIcon: require('../assets/apps/report_cards_icon_1775725630881.png'),
    fallbackIcon: GraduationCap,
    category: 'Academics',
    color: '#6366F1',
    size: 'small',
  },
  {
    id: '8',
    title: 'Parent Notices',
    description: 'Draft professional updates to parents.',
    imageIcon: require('../assets/apps/parent_notices_v3_icon_1775726054303.png'),
    fallbackIcon: ContactRound,
    category: 'Communication',
    color: '#EC4899',
    size: 'small',
  },
  {
    id: '9',
    title: 'Carousel Builder',
    description: 'Create engaging social media highlights.',
    imageIcon: require('../assets/apps/carousel_builder_v4_icon_final_1775726208533.png'),
    fallbackIcon: Images,
    category: 'Design',
    color: '#F97316',
    size: 'small',
  },
];

export default function AppsPage() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [launchingApp, setLaunchingApp] = useState<AppData | null>(null);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [showLessonPlanner, setShowLessonPlanner] = useState(false);
  const [showReportCardGenerator, setShowReportCardGenerator] = useState(false);

  const handleLaunchApp = (app: AppData) => {
    setLaunchingApp(app);
    setTimeout(() => {
      setLaunchingApp(null);
      if (app.id === '1') {
        setShowQuoteBuilder(true);
      } else if (app.id === '2') {
        setShowLessonPlanner(true);
      } else if (app.id === '7') {
        setShowReportCardGenerator(true);
      }
    }, 1500); // Reduced slightly for better UX
  };

  const filteredApps = useMemo(() => {
    return APPS.filter(app => {
      const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           app.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || app.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const isMobile = width < 768;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Apps Library</Text>
        <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
          Premium 3D utilities for school management.
        </Text>

        <View style={[styles.searchContainer, { backgroundColor: colors.surfaceHover, borderColor: colors.border }]}>
          <Search size={18} color={colors.textSubtle} />
          <TextInput
            placeholder="Search apps..."
            placeholderTextColor={colors.textSubtle}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categories}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[
                styles.categoryChip,
                { backgroundColor: activeCategory === cat ? colors.primary : colors.surfaceHover },
                activeCategory === cat && { borderColor: colors.primary }
              ]}
            >
              <Text style={[
                styles.categoryLabel, 
                { color: activeCategory === cat ? colors.textInverse : colors.textMuted }
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.gridContainer, isMobile && styles.mobileGrid]}>
        {filteredApps.map(app => (
          <BentoCard
            key={app.id}
            title={app.title}
            description={app.description}
            imageIcon={app.imageIcon}
            fallbackIcon={app.fallbackIcon}
            category={app.category}
            color={app.color}
            size={isMobile ? 'wide' : 'small'}
            onPress={() => handleLaunchApp(app)}
          />
        ))}
      </View>

      {launchingApp && (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.background + 'F0' }]}>
          <View style={[styles.launchIcon, { backgroundColor: launchingApp.color + '20' }]}>
            {launchingApp.imageIcon ? (
                <Image 
                  source={launchingApp.imageIcon} 
                  style={{ width: 84, height: 84, borderRadius: 24, overflow: 'hidden' }} 
                />
            ) : (
                <launchingApp.fallbackIcon size={48} color={launchingApp.color} />
            )}
          </View>
          <Text style={[styles.launchTitle, { color: colors.text }]}>Launching {launchingApp.title}...</Text>
          <ActivityIndicator color={launchingApp.color} size="large" />
        </View>
      )}

      {showQuoteBuilder && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 2000 }]}>
            <QuoteBuilderApp onBack={() => setShowQuoteBuilder(false)} />
        </View>
      )}
      {showLessonPlanner && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 2000 }]}>
            <LessonPlannerApp onBack={() => setShowLessonPlanner(false)} />
        </View>
      )}
      {showReportCardGenerator && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 2000 }]}>
            <ReportCardGeneratorApp onBack={() => setShowReportCardGenerator(false)} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.bold,
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: Fonts.regular,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontFamily: Fonts.regular,
  },
  categories: {
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 20,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryLabel: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -6,
  },
  mobileGrid: {
    flexDirection: 'column',
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    ...Platform.select({
        web: {
            position: 'fixed' as any
        }
    })
  },
  launchIcon: {
    width: 120,
    height: 120,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  launchTitle: {
    fontSize: 22,
    fontFamily: Fonts.semibold,
    marginBottom: 24,
  }
});
