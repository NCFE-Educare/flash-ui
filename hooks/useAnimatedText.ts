import { useState, useEffect, useRef } from "react";

/**
 * useAnimatedText
 * Smoothly reveals text character-by-character or word-by-word.
 * Inspired by framer-motion's animate() but optimized for React Native / Web.
 */
export function useAnimatedText(text: string, delimiter: string = "") {
  const [cursor, setCursor] = useState(0);
  const [prevText, setPrevText] = useState(text);
  const [startingCursor, setStartingCursor] = useState(0);

  // Handle updates to the source text (e.g. from a stream)
  if (prevText !== text) {
    setPrevText(text);
    // If we're appending to the current text, resume from where we are.
    // Otherwise, reset to 0 (e.g. when a new message starts).
    setStartingCursor(text.startsWith(prevText) ? cursor : 0);
  }

  useEffect(() => {
    const parts = text.split(delimiter);
    // If we've already revealed everything, do nothing.
    if (cursor >= parts.length && text === prevText) return;

    let startTimestamp: number | null = null;
    const totalParts = parts.length;
    
    // reveal speed: 25ms per character (delimiter="") or 75ms per word (delimiter=" ")
    const durationPerPart = delimiter === "" ? 20 : 70;
    const remainingParts = Math.max(1, totalParts - startingCursor);
    // Cap total animation time to 2s to keep it responsive
    const totalDuration = Math.min(2000, remainingParts * durationPerPart);

    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / totalDuration, 1);
      
      const nextCursor = Math.floor(startingCursor + progress * (totalParts - startingCursor));
      
      setCursor(nextCursor);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [text, startingCursor, delimiter]);

  const parts = text.split(delimiter);
  return parts.slice(0, cursor).join(delimiter);
}
