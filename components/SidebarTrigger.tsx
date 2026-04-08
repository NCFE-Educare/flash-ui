import React from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LucideIcon, ChevronLeft, ChevronRight, PanelLeft } from 'lucide-react-native';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';

interface SidebarTriggerProps {
  style?: any;
}

export default function SidebarTrigger({ style }: SidebarTriggerProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { colors } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surfaceHover, borderColor: colors.border }, style]}
      onPress={toggleSidebar}
      activeOpacity={0.7}
    >
      <PanelLeft 
        size={18} 
        color={colors.textSubtle} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
