import React, { useEffect, useState, useRef, useMemo } from "react";
import { View, Text, Platform, Animated, StyleSheet } from "react-native";
import { Fonts } from "../constants/theme";

interface TextGenerateEffectProps {
  words: string;
  style?: any;
  filter?: boolean;
  duration?: number;
  staggerMs?: number;
}

export function TextGenerateEffect({
  words,
  style,
  filter = true,
  duration = 0.45,
  staggerMs = 28,
}: TextGenerateEffectProps) {
  const wordsArray = useMemo(
    () => words.split(" ").filter(Boolean),
    [words],
  );
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const target = wordsArray.length;
    if (target === 0) return;

    const timer = setInterval(() => {
      setVisibleCount((prev) => {
        const next = prev + 1;
        if (next >= target) clearInterval(timer);
        return Math.min(next, target);
      });
    }, staggerMs);

    return () => clearInterval(timer);
  }, [wordsArray.length, staggerMs]);

  if (Platform.OS === "web") {
    return <WebEffect wordsArray={wordsArray} visibleCount={visibleCount} style={style} filter={filter} duration={duration} />;
  }

  return <NativeEffect wordsArray={wordsArray} visibleCount={visibleCount} style={style} duration={duration} />;
}

function WebEffect({
  wordsArray,
  visibleCount,
  style,
  filter,
  duration,
}: {
  wordsArray: string[];
  visibleCount: number;
  style?: any;
  filter: boolean;
  duration: number;
}) {
  return (
    <View>
      <style
        dangerouslySetInnerHTML={{
          __html: `.tge-word{display:inline;transition:opacity ${duration}s ease,filter ${duration}s ease;}`,
        }}
      />
      <Text style={style}>
        {wordsArray.map((word, idx) => (
          <span
            key={idx}
            className="tge-word"
            style={{
              opacity: idx < visibleCount ? 1 : 0,
              filter: filter
                ? idx < visibleCount
                  ? "blur(0px)"
                  : "blur(10px)"
                : "none",
            }}
          >
            {word}{" "}
          </span>
        ))}
      </Text>
    </View>
  );
}

function NativeEffect({
  wordsArray,
  visibleCount,
  style,
  duration,
}: {
  wordsArray: string[];
  visibleCount: number;
  style?: any;
  duration: number;
}) {
  const anims = useRef<Animated.Value[]>([]);

  while (anims.current.length < wordsArray.length) {
    anims.current.push(new Animated.Value(0));
  }

  useEffect(() => {
    if (visibleCount === 0) return;
    const idx = visibleCount - 1;
    if (idx < anims.current.length) {
      Animated.timing(anims.current[idx], {
        toValue: 1,
        duration: duration * 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [visibleCount, duration]);

  return (
    <Text style={style}>
      {wordsArray.map((word, idx) => (
        <Animated.Text key={idx} style={{ opacity: idx < anims.current.length ? anims.current[idx] : 0 }}>
          {word}{" "}
        </Animated.Text>
      ))}
    </Text>
  );
}
