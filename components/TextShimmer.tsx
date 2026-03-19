import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, Easing, Platform } from "react-native";
import { Fonts } from "../constants/theme";

interface TextShimmerProps {
  children: string;
  style?: any;
}

export function TextShimmer({ children, style }: TextShimmerProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false, // Color animation doesn't support native driver
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start(() => startAnimation());
    };
    startAnimation();
  }, [animatedValue]);

  const color = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#a1a1aa", "#ffffff"],
  });

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.text, style, { color }]}>
        {children}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    alignSelf: "flex-start",
    backgroundColor: "transparent",
  },
  text: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    fontStyle: "italic",
    paddingHorizontal: 4,
  },
});
