import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

interface SidebarContextType {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode, defaultOpen?: boolean }> = ({ 
  children, 
  defaultOpen = true 
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  
  const [open, setOpenInternal] = useState(defaultOpen);

  const setOpen = useCallback((value: boolean | ((v: boolean) => boolean)) => {
    setOpenInternal(value);
  }, []);

  const toggleSidebar = useCallback(() => {
    setOpenInternal((prev) => !prev);
  }, []);

  const state = open ? "expanded" : "collapsed";

  return (
    <SidebarContext.Provider
      value={{
        state,
        open,
        setOpen,
        isMobile,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
};
