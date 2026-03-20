"use client";

import { RAD, GRAY, T } from "../../styles/tokens";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = RAD.md, style }: SkeletonProps) {
  return (
    <div
      style={{
        width, height, borderRadius,
        background: `linear-gradient(90deg, ${T.bgSurface} 25%, ${T.borderDefault} 50%, ${T.bgSurface} 75%)`,
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3, style }: { lines?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}
