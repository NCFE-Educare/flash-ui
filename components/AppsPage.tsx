import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  useWindowDimensions,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { 
  Search,
  Globe,
  Plus,
  MessageSquareQuote,
  BookOpen,
  Calendar,
  FileEdit,
  Bell,
  Users,
  GraduationCap,
  Mail,
  Layout
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/theme';
import AppCard from './AppCard';

const CATEGORIES = ['All', 'Academics', 'Admin', 'Planning', 'Design', 'Communication'];

const APPS = [
  {
    id: '1',
    title: 'Quote Builder',
    description: 'Create and design inspirational quotes for your school boards.',
    icon: MessageSquareQuote,
    category: 'Design',
    color: '#8B5CF6', // Violet
  },
  {
    id: '2',
    title: 'Lesson Planner',
    description: 'Structured planning tools for daily and weekly lessons.',
    icon: BookOpen,
    category: 'Planning',
    color: '#10B981', // Emerald
  },
  {
    id: '3',
    title: 'Exam Scheduler',
    description: 'Automated scheduling for mid-terms and finals.',
    icon: Calendar,
    category: 'Academics',
    color: '#3B82F6', // Blue
  },
  {
    id: '4',
    title: 'Question Paper',
    description: 'AI-assisted question paper generation and formatting.',
    icon: FileEdit,
    category: 'Academics',
    color: '#F59E0B', // Amber
  },
  {
    id: '5',
    title: 'Circular Creation',
    description: 'Draft official notices and circulars for staff and students.',
    icon: Bell,
    category: 'Admin',
    color: '#EF4444', // Red
  },
  {
    id: '6',
    title: 'Seating Plan',
    description: 'Generate optimized exam seating arrangements instantly.',
    icon: Users,
    category: 'Admin',
    color: '#06B6D4', // Cyan
  },
  {
    id: '7',
    title: 'Report Cards',
    description: 'Comprehensive student performance tracking and generation.',
    icon: GraduationCap,
    category: 'Academics',
    color: '#6366F1', // Indigo
  },
  {
    id: '8',
    title: 'Parent Notices',
    description: 'Draft and send professional updates to parents.',
    icon: Mail,
    category: 'Communication',
    color: '#EC4899', // Pink
  },
  {
    id: '9',
    title: 'Carousel Builder',
    description: 'Create engaging social media carousels for school events.',
    icon: Layout,
    category: 'Design',
    color: '#F97316', // Orange
  },
];

export default function AppsPage() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [launchingApp, setLaunchingApp] = useState<typeof APPS[0] | null>(null);

  const handleLaunchApp = (app: typeof APPS[0]) => {
    setLaunchingApp(app);
    setTimeout(() => {
      setLaunchingApp(null);
    }, 2000); // Mock launch duration
  };

  const filteredApps = useMemo(() => {
    return APPS.filter(app => {
      const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           app.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'All' || app.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const numColumns = width > 1200 ? 4 : width > 800 ? 3 : 2;

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>Apps Library</Text>
      <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
        Launch specialized tools powered by Cortex.
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
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredApps}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        key={numColumns} // Force re-render when column count changes
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <AppCard
            title={item.title}
            description={item.description}
            icon={item.icon}
            category={item.category}
            color={item.color}
            onPress={() => handleLaunchApp(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.textSubtle, fontFamily: Fonts.medium }}>No apps found matching your criteria.</Text>
          </View>
        }
      />

      {launchingApp && (
        <View style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.background + 'F0' }]}>
          <View style={[styles.launchIcon, { backgroundColor: launchingApp.color + '20' }]}>
            <launchingApp.icon size={48} color={launchingApp.color} />
          </View>
          <Text style={[styles.launchTitle, { color: colors.text }]}>Launching {launchingApp.title}...</Text>
          <ActivityIndicator color={launchingApp.color} size="large" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  categories: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
  },
  row: {
    justifyContent: 'flex-start',
  },
  empty: {
    marginTop: 60,
    alignItems: 'center',
  },
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  launchIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  launchTitle: {
    fontSize: 20,
    fontFamily: Fonts.semibold,
    marginBottom: 20,
  }
});
