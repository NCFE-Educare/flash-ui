import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '../constants/theme';
import { useResponsive } from '../hooks/useResponsive';
import PurpleOrb from './PurpleOrb';
import { useTheme } from '../context/ThemeContext';

const CARDS = [
    {
        icon: 'pie-chart-outline',
        title: 'Synthesize Data',
        subtitle: 'Turn my meeting notes into 5 key bullet points for the team.',
        prompt: 'Synthesize my meeting notes into 5 key bullet points',
    },
    {
        icon: 'bulb-outline',
        title: 'Creative Brainstorm',
        subtitle: 'Generate 3 taglines for a new sustainable fashion brand.',
        prompt: 'Generate 3 taglines for a new sustainable fashion brand',
    },
    {
        icon: 'create-outline',
        title: 'Check Facts',
        subtitle: 'Compare key differences between GDPR and CCPA.',
        prompt: 'Compare key differences between GDPR and CCPA',
    },
];

interface ChatWelcomeProps {
    onSuggestion(text: string): void;
}

export default function ChatWelcome({ onSuggestion }: ChatWelcomeProps) {
    const r = useResponsive();
    const { colors } = useTheme();

    // Responsive values
    const orbSize = r.isDesktop ? 130 : r.isTablet ? 110 : 90;
    const greetingSize = r.isDesktop ? 34 : r.isTablet ? 28 : 22;
    const subSize = r.isDesktop ? 28 : r.isTablet ? 22 : 18;
    const hPad = r.isDesktop ? 120 : r.isTablet ? 48 : 20;

    const s = getStyles(colors);

    return (
        <ScrollView
            contentContainerStyle={[s.container, { paddingHorizontal: hPad }]}
            showsVerticalScrollIndicator={false}
        >
            <View style={s.orbWrap}>
                <PurpleOrb size={orbSize} />
            </View>

            <Text style={[s.greeting, { fontSize: greetingSize }]}>Hello, Cortex User</Text>
            <Text style={[s.subGreeting, { fontSize: subSize }]}>How can I assist you today?</Text>

            {/* Cards: row on desktop/tablet, column on mobile */}
            <View style={[s.cards, r.isMobile && s.cardsColumn]}>
                {CARDS.map(card => (
                    <QuickCard
                        key={card.title}
                        {...card}
                        flex={!r.isMobile}
                        onTap={() => onSuggestion(card.prompt)}
                        colors={colors}
                    />
                ))}
            </View>
        </ScrollView>
    );
}

function QuickCard({
    icon, title, subtitle, onTap, flex, colors,
}: { icon: string; title: string; subtitle: string; onTap(): void; flex: boolean, colors: any }) {
    const [hovered, setHovered] = React.useState(false);
    const s = getStyles(colors);

    return (
        <TouchableOpacity
            style={[s.card, flex && { flex: 1 }, hovered && s.cardHovered]}
            onPress={onTap}
            activeOpacity={0.8}
            // @ts-ignore – web only
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Ionicons name={icon as any} size={20} color={colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={s.cardTitle}>{title}</Text>
            <Text style={s.cardSubtitle}>{subtitle}</Text>
        </TouchableOpacity>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
    container: { paddingTop: 28, paddingBottom: 24, alignItems: 'center' },
    orbWrap: { marginBottom: 24 },
    greeting: { fontFamily: Fonts.semibold, color: colors.primary, marginBottom: 8 },
    subGreeting: { fontFamily: Fonts.bold, color: colors.text, marginBottom: 36, textAlign: 'center' },
    cards: { flexDirection: 'row', gap: 14, width: '100%' },
    cardsColumn: { flexDirection: 'column' },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.borderDark,
        marginBottom: 12,
    },
    cardHovered: {
        backgroundColor: colors.primaryBg,
        borderColor: colors.primary,
    },
    cardTitle: { fontSize: 14, fontFamily: Fonts.semibold, color: colors.text, marginBottom: 6 },
    cardSubtitle: { fontSize: 12, fontFamily: Fonts.regular, color: colors.textSubtle, lineHeight: 18 },
});
