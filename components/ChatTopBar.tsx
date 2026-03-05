import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../context/ThemeContext';

interface ChatTopBarProps {
    sidebarCollapsed: boolean;
    onToggleSidebar(): void;
}

export default function ChatTopBar({ sidebarCollapsed, onToggleSidebar }: ChatTopBarProps) {
    const r = useResponsive();
    const { colors } = useTheme();
    const s = getStyles(colors);

    return (
        <View style={s.root}>
            {/* Sidebar toggle (when collapsed on desktop) */}
            {sidebarCollapsed && (
                <TouchableOpacity onPress={onToggleSidebar} style={s.sidebarToggle}>
                    <View style={s.miniLogo}>
                        <Ionicons name="sparkles" size={12} color="#fff" />
                    </View>
                </TouchableOpacity>
            )}

            {/* Cortex dropdown */}
            <TouchableOpacity style={s.dropdown} activeOpacity={0.8}>
                <View style={s.miniLogo}>
                    <Ionicons name="sparkles" size={11} color="#fff" />
                </View>
                <Text style={s.dropdownText}>Cortex</Text>
                <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* Actions — hide Export on tablet to save space */}
            <TopBarBtn icon="ellipsis-horizontal" colors={colors} />
            <TopBarBtn icon="link-outline" colors={colors} />
            <View style={{ width: 8 }} />

            {r.isDesktop && (
                <>
                    <TouchableOpacity style={s.exportBtn} activeOpacity={0.8}>
                        <Ionicons name="download-outline" size={13} color={colors.textMuted} />
                        <Text style={s.exportText}>Export chat</Text>
                    </TouchableOpacity>
                    <View style={{ width: 8 }} />
                </>
            )}

            <TouchableOpacity style={s.upgradeBtn} activeOpacity={0.85}>
                <Text style={s.upgradeText}>{r.isMobile ? 'Pro' : 'Upgrade'}</Text>
            </TouchableOpacity>
        </View>
    );
}

function TopBarBtn({ icon, colors }: { icon: string, colors: any }) {
    const s = getStyles(colors);
    return (
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
            <Ionicons name={icon as any} size={17} color={colors.textMuted} />
        </TouchableOpacity>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    root: {
        height: 54,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sidebarToggle: { marginRight: 10 },
    miniLogo: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    dropdown: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    dropdownText: { fontSize: 13, fontFamily: Fonts.semibold, color: colors.text },
    iconBtn: { padding: 6 },
    exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    exportText: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textMuted },
    upgradeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.text },
    upgradeText: { fontSize: 13, fontFamily: Fonts.semibold, color: colors.background },
});
