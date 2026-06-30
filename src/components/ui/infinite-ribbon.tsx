"use client";

interface RibbonItem {
  label: string;
  value?: string;
  icon?: string;
}

interface InfiniteRibbonProps {
  items: RibbonItem[];
  speed?: number;
  className?: string;
}

export function InfiniteRibbon({
  items,
  speed = 30,
  className = "",
}: InfiniteRibbonProps) {
  const doubled = [...items, ...items];

  return (
    <div className={`overflow-hidden ${className}`}>
      <div
        className="flex gap-8 whitespace-nowrap animate-marquee"
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 shrink-0"
          >
            {item.icon && <span>{item.icon}</span>}
            <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
              {item.value && (
                <span style={{ color: "#ff1493" }}>{item.value}</span>
              )}
              {" "}
              {item.label}
            </span>
            <span className="ml-4" style={{ color: "rgba(255,0,255,0.3)" }}>•</span>
          </div>
        ))}
      </div>
    </div>
  );
}
