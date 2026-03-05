import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';

interface PurpleOrbProps {
    size?: number;
}

export default function PurpleOrb({ size = 130 }: PurpleOrbProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.08,
                    duration: 3000,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    return (
        <Animated.View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, { transform: [{ scale: scaleAnim }] }]}>
            {/* Outer glow ring */}
            <View style={[StyleSheet.absoluteFillObject, styles.glowRing, { borderRadius: size / 2 }]} />
            {/* Main orb body */}
            <View style={[StyleSheet.absoluteFillObject, styles.orbBody, { borderRadius: size / 2 }]} />
            {/* Highlight */}
            <View style={[styles.highlight, { width: size * 0.35, height: size * 0.35, borderRadius: size * 0.2, top: size * 0.12, left: size * 0.15 }]} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'visible',
        alignItems: 'center',
        justifyContent: 'center',
        ...(Platform.OS !== 'web' ? {
            shadowColor: '#8B5CF6',
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 40,
            shadowOpacity: 0.5,
            elevation: 20,
        } : {}),
    },
    glowRing: {
        backgroundColor: 'rgba(109,40,217,0.15)',
        transform: [{ scale: 1.2 }],
    },
    orbBody: {
        backgroundColor: '#C4B5FD',
        // Simulate radial gradient with nested layers
    },
    highlight: {
        position: 'absolute',
        backgroundColor: 'rgba(255,255,255,0.65)',
    },
});
