import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SidebarContextType {
  isCollapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  sidebarWidth: number;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

const STORAGE_KEY = '@sidebar_collapsed';

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [isCollapsed, setIsCollapsedInternal] = useState(false);

  // Load initial state from storage
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
          setIsCollapsedInternal(saved === 'true');
        } else if (isTablet) {
          // Default to collapsed on tablet
          setIsCollapsedInternal(true);
        }
      } catch (e) {
        console.error('Failed to load sidebar state', e);
      }
    };
    loadState();
  }, [isTablet]);

  const setCollapsed = useCallback(async (collapsed: boolean) => {
    setIsCollapsedInternal(collapsed);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, collapsed ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to save sidebar state', e);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed(!isCollapsed);
  }, [isCollapsed, setCollapsed]);

  // Dynamic width calculation
  const getWidth = () => {
    if (!isDesktop && !isTablet) return 280; // Mobile drawer width
    if (isCollapsed) return 50;
    return isTablet ? 200 : 200;
  };

  const sidebarWidth = getWidth();

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        setCollapsed,
        toggleSidebar,
        sidebarWidth,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
