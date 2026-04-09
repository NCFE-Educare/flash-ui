import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image, Platform } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export type BentoSize = 'small' | 'wide' | 'large';

interface BentoCardProps {
  title: string;
  description: string;
  imageIcon?: any;
  fallbackIcon?: LucideIcon;
  category: string;
  color: string;
  size: BentoSize;
  onPress: () => void;
}

export default function BentoCard({ 
  title, 
  description, 
  imageIcon, 
  fallbackIcon: FallbackIcon, 
  category, 
  color, 
  size,
  onPress 
}: BentoCardProps) {
  const { colors } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const isWide = size === 'wide';
  const isLarge = size === 'large';

  return (
    <Animated.View style={[
      styles.animatedContainer, 
      { transform: [{ scale: scaleAnim }] },
      isWide && styles.wide,
      isLarge && styles.large,
      !isWide && !isLarge && styles.small
    ]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <LinearGradient
          colors={[color + '10', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            {imageIcon ? (
              <Image source={imageIcon} style={styles.imageIcon} resizeMode="contain" />
            ) : FallbackIcon ? (
              <FallbackIcon size={isLarge ? 40 : 28} color={color} strokeWidth={1.5} />
            ) : null}
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.category, { color: color }]}>{category}</Text>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
            {(isWide || isLarge) && (
              <Text style={[styles.description, { color: colors.textSubtle }]} numberOfLines={2}>
                {description}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    padding: 6,
  },
  small: {
    width: '33.33%',
    height: 180,
  },
  wide: {
    width: '66.66%',
    height: 180,
  },
  large: {
    width: '66.66%',
    height: 372, // 180 * 2 + 12 (padding)
  },
  card: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
      }
    })
  },
  imageIcon: {
    width: 70,
    height: 70,
    position: 'absolute',
  },
  textContainer: {
    marginTop: 12,
  },
  category: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
  },
  description: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    marginTop: 6,
  },
});
