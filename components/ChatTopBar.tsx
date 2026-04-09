import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Pressable,
    StyleSheet,
    Image,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { SidebarTrigger, useSidebar } from './ui/sidebar';

interface ChatTopBarProps {
    onViewReminders?(): void;
    onExportChat?(): void;
}

export default function ChatTopBar({ 
    onViewReminders, 
    onExportChat
}: ChatTopBarProps) {
    const r = useResponsive();
    const { colors, mode, setMode } = useTheme();
    const { open, toggleSidebar } = useSidebar();
    const ThemeIcon = mode === 'light' ? 'moon-outline' : 'sunny-outline';
    const {
        notifications,
        notificationCount,
        dismissNotification,
        dismissAllNotifications,
        pendingReminders,
        refreshPending,
        navigateToReminders,
    } = useNotifications();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const s = getStyles(colors);

    const handleViewAll = () => {
        setDropdownOpen(false);
        navigateToReminders();
        onViewReminders?.();
    };

    return (
        <View style={s.root}>
            {!open && (
                <View style={{ zIndex: 10000, elevation: 100 }}>
                    <SidebarTrigger 
                        style={{ marginRight: 12 }} 
                    />
                </View>
            )}

            {/* Cortex dropdown */}
            <TouchableOpacity style={s.dropdown} activeOpacity={0.8}>
                <Image source={require('../assets/logo.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
                <Text style={s.dropdownText}>Cortex</Text>
                <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* Actions — hide Export on tablet to save space */}
            <TopBarBtn icon="ellipsis-horizontal" colors={colors} />
            <TouchableOpacity 
                style={s.iconBtn} 
                activeOpacity={0.7} 
                onPress={() => setMode(mode === 'light' ? 'dark' : 'light')}
            >
                <Ionicons name={ThemeIcon} size={17} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={{ width: 8 }} />

            {/* Notification bell */}
            <View style={s.bellWrap}>
                <TouchableOpacity
                    onPress={() => setDropdownOpen((o) => !o)}
                    style={s.iconBtn}
                    activeOpacity={0.7}
                >
                    <Ionicons name="notifications-outline" size={17} color={colors.textMuted} />
                    {notificationCount > 0 && (
                        <View style={s.badge}>
                            <Text style={s.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                {dropdownOpen && (
                    <>
                        <TouchableOpacity
                            style={s.dropdownOverlay}
                            activeOpacity={1}
                            onPress={() => setDropdownOpen(false)}
                        />
                        <View style={s.dropdownPanel}>
                            <View style={s.dropdownHeader}>
                                <Text style={s.dropdownTitle}>Notifications</Text>
                                <View style={s.headerActions}>
                                    {notifications.length > 0 && (
                                        <TouchableOpacity onPress={dismissAllNotifications} style={s.iconBtn}>
                                            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity onPress={() => refreshPending()} style={s.iconBtn}>
                                        <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {notifications.length === 0 && pendingReminders.length === 0 ? (
                                <Text style={s.dropdownEmpty}>No notifications</Text>
                            ) : (
                                <ScrollView style={s.dropdownList} nestedScrollEnabled>
                                    {notifications.length > 0 && (
                                        <>
                                            <Text style={s.sectionLabel}>Delivered</Text>
                                            {notifications.map((n) => (
                                                <View key={n.id} style={s.notificationItem}>
                                                    <Text style={s.dropdownItem} numberOfLines={2}>
                                                        {n.message}
                                                    </Text>
                                                    <TouchableOpacity
                                                        onPress={() => dismissNotification(n.id)}
                                                        style={s.dismissBtn}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    >
                                                        <Ionicons name="close" size={16} color={colors.textMuted} />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </>
                                    )}
                                    {pendingReminders.length > 0 && (
                                        <>
                                            <Text style={[s.sectionLabel, notifications.length > 0 && s.sectionLabelMargin]}>
                                                Upcoming
                                            </Text>
                                            {[...pendingReminders]
                                                .sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime())
                                                .slice(0, 3)
                                                .map((r) => (
                                                    <View key={`p-${r.id}`} style={s.notificationItem}>
                                                        <Text style={[s.dropdownItem, s.pendingItem]} numberOfLines={2}>
                                                            {r.message}
                                                        </Text>
                                                    </View>
                                                ))}
                                        </>
                                    )}
                                </ScrollView>
                            )}
                            <Pressable style={s.viewAllBtn} onPress={handleViewAll}>
                                <Text style={s.viewAllText}>View all reminders</Text>
                                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                            </Pressable>
                        </View>
                    </>
                )}
            </View>
            <View style={{ width: 8 }} />

            {r.isDesktop && (
                <>
                    <TouchableOpacity style={s.exportBtn} activeOpacity={0.8} onPress={onExportChat}>
                        <Ionicons name="download-outline" size={13} color={colors.textMuted} />
                        <Text style={s.exportText}>Export chat</Text>
                    </TouchableOpacity>
                    <View style={{ width: 8 }} />
                </>
            )}

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
        position: 'relative',
        zIndex: 50,
        elevation: 50,
        overflow: 'visible',
    },
    bellWrap: { position: 'relative', overflow: 'visible' },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: Fonts.semibold,
        color: colors.textInverse,
    },
    dropdownOverlay: {
        position: 'absolute',
        top: 0,
        left: -5000,
        right: -5000,
        bottom: -400,
        zIndex: 10,
    },
    dropdownPanel: {
        position: 'absolute',
        top: 44,
        right: 0,
        width: 280,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 100,
        overflow: 'hidden',
    },
    dropdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    dropdownTitle: {
        fontSize: 14,
        fontFamily: Fonts.semibold,
        color: colors.text,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sectionLabel: {
        fontSize: 11,
        fontFamily: Fonts.semibold,
        color: colors.textSubtle,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        paddingHorizontal: 14,
        paddingTop: 8,
        paddingBottom: 4,
    },
    sectionLabelMargin: {
        paddingTop: 12,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 8,
    },
    dismissBtn: {
        padding: 4,
    },
    pendingItem: {
        color: colors.textMuted,
    },
    dropdownEmpty: {
        fontSize: 13,
        fontFamily: Fonts.regular,
        color: colors.textMuted,
        padding: 16,
        textAlign: 'center',
    },
    dropdownList: {
        maxHeight: 220,
        paddingVertical: 8,
    },
    dropdownItem: {
        fontSize: 13,
        fontFamily: Fonts.regular,
        color: colors.text,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    viewAllText: {
        fontSize: 13,
        fontFamily: Fonts.medium,
        color: colors.primary,
    },
    miniLogo: { width: 22, height: 22, borderRadius: 6, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    dropdown: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    dropdownText: { fontSize: 13, fontFamily: Fonts.semibold, color: colors.text },
    iconBtn: { padding: 6 },
    exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    exportText: { fontSize: 13, fontFamily: Fonts.medium, color: colors.textMuted },
});
