import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { Fonts } from '../constants/theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type StepStatus = 'complete' | 'active' | 'pending';

interface ChainOfThoughtProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  colors?: any;
}

export const ChainOfThought: React.FC<ChainOfThoughtProps> = ({ children, defaultOpen = true, colors }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  return (
    <View style={styles.container}>
      <ChainOfThoughtHeader isOpen={isOpen} onToggle={toggleOpen} colors={colors} />
      {isOpen && <View style={styles.content}>{children}</View>}
    </View>
  );
};

interface HeaderProps {
  isOpen: boolean;
  onToggle: () => void;
  colors?: any;
}

export const ChainOfThoughtHeader: React.FC<HeaderProps> = ({ isOpen, onToggle, colors }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      style={styles.header}
    >
      <View style={styles.headerLeft}>
        <Ionicons name="sparkles" size={16} color={colors?.primary || "#8b5cf6"} />
        <Text style={[styles.headerTitle, colors && { color: colors.textSubtle }]}>Chain of Thought</Text>
      </View>
      <Ionicons
        name={isOpen ? 'chevron-up' : 'chevron-down'}
        size={16}
        color={colors?.textSubtle || "#9ca3af"}
      />
    </TouchableOpacity>
  );
};

interface StepProps {
  label: string;
  description?: string;
  status?: StepStatus;
  icon?: keyof typeof Ionicons.glyphMap;
  colors?: any;
}

export const ChainOfThoughtStep: React.FC<StepProps> = ({
  label,
  description,
  status = 'complete',
  icon = 'ellipse',
  colors,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'active': return colors?.primary || '#8b5cf6';
      case 'complete': return '#10b981';
      default: return colors?.textSubtle || '#9ca3af';
    }
  };

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepIconColumn}>
        <Ionicons name={icon as any} size={16} color={getStatusColor()} />
        <View style={[styles.stepLine, colors && { backgroundColor: colors.border }]} />
      </View>
      <View style={styles.stepContent}>
        <Text style={[
          styles.stepLabel, 
          { color: status === 'pending' ? (colors?.textSubtle || '#6b7280') : (colors?.text || '#f3f4f6') }
        ]}>
          {label}
        </Text>
        {description && (
          <Text style={[styles.stepDescription, colors && { color: colors.textSubtle }]}>
            {description}
          </Text>
        )}
      </View>
    </View>
  );
};

export const ChainOfThoughtSearchResults: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.searchResultsContainer}>{children}</View>
);

export const ChainOfThoughtSearchResult: React.FC<{ label: string; url?: string; colors?: any }> = ({ label, colors }) => (
  <View style={[styles.searchBadge, colors && { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.searchBadgeText, colors && { color: colors.textSubtle }]}>{label}</Text>
  </View>
);

export const ChainOfThoughtImage: React.FC<{ source: string; caption?: string; colors?: any }> = ({ source, caption, colors }) => (
  <View style={[styles.imageContainer, colors && { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Image source={{ uri: source }} style={styles.stepImage} resizeMode="cover" />
    {caption && <Text style={[styles.imageCaption, colors && { color: colors.textSubtle }]}>{caption}</Text>}
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0, // Let parent handle padding
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#9ca3af',
    fontSize: 13,
    fontFamily: Fonts.medium || 'System',
  },
  content: {
    paddingVertical: 8,
  },
  stepContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  stepIconColumn: {
    alignItems: 'center',
    width: 20,
  },
  stepLine: {
    width: 1,
    flex: 1,
    backgroundColor: '#374151',
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 12,
  },
  stepLabel: {
    fontSize: 14,
    fontFamily: Fonts.medium || 'System',
    lineHeight: 20,
  },
  stepDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
    lineHeight: 18,
  },
  searchResultsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginLeft: 32,
    marginBottom: 12,
  },
  searchBadge: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  searchBadgeText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  imageContainer: {
    marginLeft: 32,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  stepImage: {
    width: '100%',
    height: 200,
  },
  imageCaption: {
    padding: 10,
    color: '#9ca3af',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
