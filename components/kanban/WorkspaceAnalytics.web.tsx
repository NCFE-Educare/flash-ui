import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform, ScrollView, TouchableOpacity, Modal, useWindowDimensions } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { kanbanApi, KanbanAnalytics } from "../../services/api";
import { Fonts } from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

// Types for recharts
let Recharts: any = null;

interface WorkspaceAnalyticsProps {
  workspaceId: number;
}

const PRIORITY_COLORS: any = {
  urgent: "#ef4444",
  high: "#ff9800",
  medium: "#3b82f6",
  low: "#10b981",
};

const STATUS_COLORS = ["#8b5cf6", "#10b981", "#3b82f6", "#6b7280"];

export default function WorkspaceAnalytics({ workspaceId }: WorkspaceAnalyticsProps) {
  const { colors } = useTheme();
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  
  const isMobile = width < 1024;
  
  const [data, setData] = useState<KanbanAnalytics | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [chartLibLoaded, setChartLibLoaded] = useState(false);
  const [isAllActivityModalVisible, setIsAllActivityModalVisible] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    if (Platform.OS === 'web') {
      try {
        Recharts = require("recharts");
        setChartLibLoaded(true);
      } catch (err) {
        console.error("Failed to load recharts", err);
      }
    }

    const fetchData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const [analyticRes, activityRes] = await Promise.all([
          kanbanApi.getWorkspaceAnalytics(token, workspaceId),
          kanbanApi.getActivity(token, workspaceId, 5) 
        ]);
        setData(analyticRes);
        setActivities(activityRes.activity || []);
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [workspaceId, token]);

  const handleShowAllActivity = async () => {
    setIsAllActivityModalVisible(true);
    if (!token || allActivities.length > 0) return;
    
    try {
      setLoadingAll(true);
      const res = await kanbanApi.getActivity(token, workspaceId, 100);
      setAllActivities(res.activity || []);
    } catch (err) {
      console.error("Failed to fetch all activity", err);
    } finally {
      setLoadingAll(false);
    }
  };

  const s = getStyles(colors, isMobile);

  if (!isMounted || loading || !chartLibLoaded) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!data || !Recharts) return null;

  const { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Label 
  } = Recharts;

  const getFormattedTime = (dateStr: string) => {
    const normalizedStr = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
    const date = new Date(normalizedStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(mins / 60);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const renderActivityItem = (item: any, isDetailed: boolean = false) => {
    const timeStr = getFormattedTime(item.created_at);
    const clockTime = new Date(item.created_at.endsWith('Z') ? item.created_at : item.created_at + 'Z').toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    return (
      <View key={item.id} style={[s.activityItem, isDetailed && s.activityItemDetailed]}>
        <View style={[s.activityAvatar, isDetailed && s.activityAvatarDetailed, { backgroundColor: colors.primaryBg }]}>
          <Text style={[s.avatarTextSmall, isDetailed && { fontSize: 14 }]}>
             {(item.username || "?").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={s.activityBody}>
          <View style={isDetailed ? { marginBottom: 6 } : { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
            <Text style={isDetailed ? s.activityUserDetailed : s.activityUserCompact}>
               {item.username}
            </Text>
            {isDetailed ? (
               <Text style={s.activityActionDetailed}>
                  {item.action === 'task_updated' ? 'updated a task' : 
                   item.action === 'comment_added' ? 'added a comment' : 
                   item.action === 'task_created' ? 'created a task' : 'performed an action'}
               </Text>
            ) : (
               <Text style={s.activityActionCompact}> {item.description || item.action.replace('_', ' ')} </Text>
            )}
            {item.task_title && (
               <View style={s.taskChipCompact}>
                 <Ionicons name="checkbox-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                 <Text style={s.taskLink} numberOfLines={1}>
                    {item.task_title}
                 </Text>
               </View>
            )}
          </View>
          {isDetailed && (
             <View style={s.detailBox}>
                <Text style={s.itemDescriptionText}>
                   "{item.description || "No detailed description provided."}"
                </Text>
             </View>
          )}
          <Text style={s.activityTime}>{timeStr} • {clockTime}</Text>
        </View>
      </View>
    );
  };

  const renderGroupedActivity = (activityList: any[], isDetailed: boolean) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const grouped: any = { Today: [], Yesterday: [], Earlier: [] };
    activityList.forEach(item => {
      const d = new Date(item.created_at.endsWith('Z') ? item.created_at : item.created_at + 'Z');
      d.setHours(0,0,0,0);
      if (d.getTime() === today.getTime()) grouped.Today.push(item);
      else if (d.getTime() === yesterday.getTime()) grouped.Yesterday.push(item);
      else grouped.Earlier.push(item);
    });
    return Object.entries(grouped).map(([key, items]: any) => {
      if (items.length === 0) return null;
      return (
        <View key={key} style={{ marginBottom: 16 }}>
          <Text style={s.groupHeader}>{key}</Text>
          <View style={{ gap: isDetailed ? 0 : 12 }}>
            {items.map((it: any) => renderActivityItem(it, isDetailed))}
          </View>
        </View>
      );
    });
  };

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {/* Top Stat Cards */}
      <View style={s.statsGrid}>
        <StatCard icon="checkmark-circle-outline" value={data.completed_tasks} label="completed" sub="7 days" color="#10b981" colors={colors} />
        <StatCard icon="create-outline" value={data.total_tasks} label="created" sub="total" color={colors.primary} colors={colors} />
        <StatCard icon="alert-circle-outline" value={data.overdue_tasks.length} label="overdue" sub="active" color="#ef4444" colors={colors} />
        <StatCard icon="trending-up-outline" value={`${Math.round(data.completion_rate)}%`} label="health" sub="velocity" color="#8b5cf6" colors={colors} />
      </View>

      {/* Grid Rows - Responsive */}
      <View style={s.gridRow}>
        <View style={s.gridItem}>
           <View style={s.chartCard}>
              <Text style={s.chartTitle}>Status overview</Text>
              <View style={s.chartBox}>
                 <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                       <Pie data={data.tasks_by_column} innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="task_count" nameKey="column_name">
                          {data.tasks_by_column.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                          ))}
                          <Label value={data.total_tasks} position="center" style={{ fontSize: '20px', fontWeight: '800', fontFamily: Fonts.bold, fill: colors.text }} />
                       </Pie>
                       <Tooltip />
                    </PieChart>
                 </ResponsiveContainer>
                 <View style={s.legendCustom}>
                    {data.tasks_by_column.map((c, i) => (
                       <View key={i} style={s.legendItem}>
                          <View style={[s.dot, { backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }]} />
                          <Text style={s.legendText}>{c.column_name}: {c.task_count}</Text>
                       </View>
                    ))}
                 </View>
              </View>
           </View>
        </View>

        <View style={s.gridItem}>
           <View style={[s.chartCard, { minHeight: 300 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                 <Text style={s.chartTitle}>Recent activity</Text>
                 <TouchableOpacity onPress={handleShowAllActivity} style={s.expandBtn}>
                    <Ionicons name="expand-outline" size={18} color={colors.textSubtle} />
                 </TouchableOpacity>
              </View>
              <View style={s.activityList}>
                 {activities.length > 0 ? renderGroupedActivity(activities, false) : (
                    <View style={s.emptyState}>
                       <Text style={s.emptyText}>No recent activity.</Text>
                    </View>
                 )}
              </View>
           </View>
        </View>
      </View>

      <View style={s.gridRow}>
        <View style={s.gridItem}>
           <View style={s.chartCard}>
              <Text style={s.chartTitle}>Priority breakdown</Text>
              <View style={[s.chartBox, { paddingLeft: 0, marginTop: 12 }]}>
                 <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.tasks_by_priority} layout="vertical">
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.border} />
                       <XAxis type="number" hide />
                       <YAxis dataKey="priority" type="category" width={70} stroke={colors.textSubtle} fontSize={11} tickFormatter={(val) => val.toUpperCase()} />
                       <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: colors.surface, borderColor: colors.border }} />
                       <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                          {data.tasks_by_priority.map((entry: any, index: number) => (
                             <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[entry.priority] || colors.primary} />
                          ))}
                       </Bar>
                    </BarChart>
                 </ResponsiveContainer>
              </View>
           </View>
        </View>

        <View style={s.gridItem}>
           <View style={s.chartCard}>
              <Text style={s.chartTitle}>Team workload</Text>
              <View style={s.workloadList}>
                 {data.tasks_by_assignee.map((member, i) => {
                    const percentage = data.total_tasks > 0 ? (member.task_count / data.total_tasks) * 100 : 0;
                    return (
                       <View key={i} style={s.workloadRow}>
                          <View style={s.memberInfo}>
                             <View style={[s.workloadAvatar, { backgroundColor: colors.primaryBg }]}>
                                <Text style={s.avatarTextSmall}>{(member.username || "?").charAt(0).toUpperCase()}</Text>
                             </View>
                             <Text style={s.memberName} numberOfLines={1}>{member.username}</Text>
                          </View>
                          <View style={s.distributionBox}>
                             <View style={s.progressContainer}>
                                <View style={[s.progressBar, { width: `${percentage}%`, backgroundColor: colors.primary }]} />
                             </View>
                             <Text style={s.typeValue}>{Math.round(percentage)}%</Text>
                          </View>
                       </View>
                    );
                 })}
              </View>
           </View>
        </View>
      </View>

      <View style={{ height: 40 }} />

      <Modal visible={isAllActivityModalVisible} transparent animationType="fade" onRequestClose={() => setIsAllActivityModalVisible(false)}>
        <View style={s.modalOverlay}>
           <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setIsAllActivityModalVisible(false)} />
           <View style={s.modalContainer}>
              <View style={s.modalHeader}>
                 <Text style={s.modalTitle}>Activity History</Text>
                 <TouchableOpacity onPress={() => setIsAllActivityModalVisible(false)} style={s.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                 </TouchableOpacity>
              </View>
              <ScrollView style={s.modalScroll} contentContainerStyle={{ padding: isMobile ? 16 : 24 }}>
                 {loadingAll ? (
                   <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                 ) : (
                    <View style={s.modalActivityList}>
                       {renderGroupedActivity(allActivities, true)}
                    </View>
                 )}
              </ScrollView>
           </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatCard({ icon, value, label, sub, color, colors }: any) {
  return (
    <View style={s_card.container}>
      <View style={[s_card.iconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View>
        <View style={s_card.row}>
           <Text style={s_card.value}>{value}</Text>
           <Text style={s_card.label}>{label}</Text>
        </View>
        <Text style={s_card.sub}>{sub}</Text>
      </View>
    </View>
  );
}

const s_card = StyleSheet.create({
  container: { flex: 1, minWidth: 140, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontSize: 20, fontFamily: Fonts.bold, color: '#111827' },
  label: { fontSize: 13, fontFamily: Fonts.medium, color: '#111827' },
  sub: { fontSize: 10, fontFamily: Fonts.regular, color: '#6b7280', marginTop: 1 }
});

const getStyles = (colors: any, isMobile: boolean) =>
  StyleSheet.create({
    container: { flex: 1, padding: isMobile ? 12 : 24, backgroundColor: colors.primaryBg },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    statsGrid: { flexDirection: "row", flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    gridRow: { flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 24, marginBottom: isMobile ? 16 : 24 },
    gridItem: { flex: 1 },
    chartCard: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: isMobile ? 16 : 24 },
    chartTitle: { fontSize: 15, fontFamily: Fonts.bold, color: colors.text, marginBottom: 8 },
    chartSub: { fontSize: 12, fontFamily: Fonts.regular, color: colors.textSubtle },
    expandBtn: { padding: 4 },
    chartBox: { alignItems: 'center', justifyContent: 'center' },
    legendCustom: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 10, height: 10, borderRadius: 2 },
    legendText: { fontSize: 11, fontFamily: Fonts.medium, color: colors.text },
    activityList: { gap: 0 },
    groupHeader: { fontSize: 10, fontFamily: Fonts.bold, color: colors.textSubtle, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    activityItem: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
    activityItemDetailed: { paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'flex-start', paddingTop: 12 },
    activityAvatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    activityAvatarDetailed: { width: 28, height: 28, borderRadius: 14 },
    avatarTextSmall: { fontSize: 9, fontFamily: Fonts.bold, color: colors.primary },
    activityBody: { flex: 1 },
    activityUserCompact: { fontSize: 13, fontFamily: Fonts.bold, color: colors.text },
    activityActionCompact: { fontSize: 13, fontFamily: Fonts.regular, color: colors.textSubtle },
    activityUserDetailed: { fontSize: 14, fontFamily: Fonts.bold, color: colors.text },
    activityActionDetailed: { fontSize: 13, fontFamily: Fonts.regular, color: colors.textSubtle, marginTop: 2 },
    taskChipCompact: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.surfaceHover, borderRadius: 4, borderWidth: 1, borderColor: colors.border, marginLeft: 4 },
    detailBox: { marginTop: 8, padding: 10, backgroundColor: colors.surfaceHover, borderRadius: 6 },
    itemDescriptionText: { fontSize: 12, fontFamily: Fonts.medium, color: colors.text, lineHeight: 16 },
    taskLink: { color: colors.primary, fontFamily: Fonts.medium, fontSize: 11 },
    activityTime: { fontSize: 10, fontFamily: Fonts.medium, color: colors.textMuted, marginTop: 4 },
    workloadList: { marginTop: 12 },
    workloadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '40%' },
    workloadAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    memberName: { fontSize: 12, fontFamily: Fonts.medium, color: colors.text },
    distributionBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    progressContainer: { flex: 1, height: 10, backgroundColor: colors.surfaceHover, borderRadius: 2, overflow: 'hidden' },
    progressBar: { height: '100%' },
    typeValue: { fontSize: 11, fontFamily: Fonts.bold, color: colors.textSubtle, marginLeft: 8, width: 30 },
    emptyState: { alignItems: 'center', padding: 24 },
    emptyText: { fontSize: 12, fontFamily: Fonts.medium, color: colors.textSubtle },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContainer: { width: isMobile ? '95%' : '60%', height: '85%', backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 18, fontFamily: Fonts.bold, color: colors.text },
    modalScroll: { flex: 1 },
    modalActivityList: { gap: 0 },
    closeBtn: { padding: 4 }
  });
