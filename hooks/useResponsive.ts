import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface Responsive {
    width: number;
    height: number;
    bp: Breakpoint;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    /** Sidebar should be shown persistently */
    hasSidebar: boolean;
}

/** Breakpoint thresholds */
export const BP = {
    tablet: 640,   // >= 640 = tablet
    desktop: 1024, // >= 1024 = desktop
};

/**
 * Reactive responsive hook.
 * Automatically re-renders whenever window dimensions change
 * (works on web resize, iOS rotation, Android foldables, etc.)
 */
export function useResponsive(): Responsive {
    const { width, height } = useWindowDimensions();

    const isDesktop = width >= BP.desktop;
    const isTablet = !isDesktop && width >= BP.tablet;
    const isMobile = !isDesktop && !isTablet;

    const bp: Breakpoint = isDesktop ? 'desktop' : isTablet ? 'tablet' : 'mobile';

    return {
        width,
        height,
        bp,
        isMobile,
        isTablet,
        isDesktop,
        hasSidebar: isDesktop, // sidebar persists only on desktop
    };
}
