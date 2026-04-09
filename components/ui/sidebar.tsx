import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated, 
  StyleSheet, 
  Platform,
  useWindowDimensions,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Fonts } from '../../constants/theme';
import { PanelLeft } from 'lucide-react-native';

import { useSidebar, SidebarProvider as SharedSidebarProvider } from '../../context/SidebarContext';

export { useSidebar };

// --- Provider Wrapper ---
export const SidebarProvider = ({ children, defaultOpen }: { children: React.ReactNode, defaultOpen?: boolean }) => {
  return (
    <SharedSidebarProvider defaultOpen={defaultOpen}>
      <View style={styles.providerContainer}>
        {children}
      </View>
    </SharedSidebarProvider>
  );
};

// --- Main Components ---

export function Sidebar({ children }: { children: React.ReactNode }) {
  const { state, isMobile, open, setOpen } = useSidebar();
  const { colors } = useTheme();
  const animWidth = useRef(new Animated.Value(open ? 260 : 60)).current;

  useEffect(() => {
    Animated.spring(animWidth, {
      toValue: open ? 220 : 52,
      damping: 20,
      stiffness: 180,
      useNativeDriver: false,
    }).start();
  }, [open]);

  if (isMobile) {
    if (!open) return null;
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
        <Pressable 
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
          onPress={() => setOpen(false)} 
        />
        <View style={[styles.sidebarMobile, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.sidebar, 
        { 
          width: animWidth, 
          backgroundColor: colors.surfaceSecondary, 
          borderRightColor: colors.border 
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function SidebarHeader({ children }: { children: React.ReactNode }) {
  return <View style={styles.header}>{children}</View>;
}

export function SidebarContent({ children }: { children: React.ReactNode }) {
  return <View style={styles.content}>{children}</View>;
}

export function SidebarGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

export function SidebarFooter({ children }: { children: React.ReactNode }) {
  return <View style={styles.footer}>{children}</View>;
}

export function SidebarTrigger({ style, onPress }: { style?: any, onPress?: () => void }) {
  const { toggleSidebar } = useSidebar();
  const { colors } = useTheme();

  return (
    <TouchableOpacity 
      style={[styles.trigger, { backgroundColor: colors.surfaceHover, borderColor: colors.border }, style]}
      onPress={onPress || toggleSidebar}
      activeOpacity={0.7}
    >
      <PanelLeft size={18} color={colors.textSubtle} />
    </TouchableOpacity>
  );
}

// --- Internal Styles ---
const styles = StyleSheet.create({
  providerContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    height: '100%',
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  sidebarMobile: {
    width: 280,
    height: '100%',
    borderRightWidth: 1,
  },
  header: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  group: {
    marginBottom: 12,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  trigger: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  }
});
