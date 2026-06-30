"use client";

import { useMemo } from "react";

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  animationDuration: number;
  delay: number;
}

interface SparklesProps {
  className?: string;
  count?: number;
  color?: string;
  minSize?: number;
  maxSize?: number;
}

function generateSparkle(count: number, minSize: number, maxSize: number): Sparkle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * (maxSize - minSize) + minSize,
    opacity: Math.random() * 0.7 + 0.3,
    animationDuration: Math.random() * 2 + 1.5,
    delay: Math.random() * 2,
  }));
}

export function Sparkles({
  className = "",
  count = 20,
  color = "#ff1493",
  minSize = 2,
  maxSize = 6,
}: SparklesProps) {
  const sparkles = useMemo(() => generateSparkle(count, minSize, maxSize), [count, minSize, maxSize]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute rounded-full animate-sparkle"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            backgroundColor: color,
            opacity: sparkle.opacity,
            animationDuration: `${sparkle.animationDuration}s`,
            animationDelay: `${sparkle.delay}s`,
            boxShadow: `0 0 ${sparkle.size * 2}px ${color}`,
          }}
        />
      ))}
    </div>
  );
}
