"use client";

interface BackgroundPathsProps {
  className?: string;
  color?: string;
  pathCount?: number;
}

export function BackgroundPaths({
  className = "",
  color = "rgba(255, 20, 147, 0.15)",
  pathCount = 12,
}: BackgroundPathsProps) {
  const paths = Array.from({ length: pathCount }, (_, i) => ({
    id: i,
    d: `M${-100 + i * 80},${200 + Math.sin(i) * 100} Q${300 + i * 50},${100 + Math.cos(i) * 80} ${600 + i * 60},${250 + Math.sin(i + 1) * 120} T${1200 + i * 40},${180 + Math.cos(i + 2) * 90}`,
    delay: i * 0.3,
    duration: 8 + i * 0.5,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 1400 400"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            className="animate-path-draw"
            style={{
              strokeDasharray: "1000",
              strokeDashoffset: "1000",
              animationDuration: `${path.duration}s`,
              animationDelay: `${path.delay}s`,
              animationIterationCount: "infinite",
              animationTimingFunction: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}
