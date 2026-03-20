"use client";

import { FONT, TXT, RAD } from "../../styles/tokens";

interface BadgeProps {
  label: string;
  color: string;
  icon?: string;
  size?: "sm" | "md";
}

export function Badge({ label, color, icon, size = "sm" }: BadgeProps) {
  const isSmall = size === "sm";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: isSmall ? TXT.xs : TXT.sm,
      fontFamily: FONT.sans, fontWeight: 600,
      color,
      background: color + "12",
      border: `1px solid ${color}25`,
      borderRadius: RAD.full,
      padding: isSmall ? "1px 8px" : "2px 10px",
      whiteSpace: "nowrap",
      lineHeight: 1.5,
    }}>
      {icon && <span>{icon}</span>}
      {label}
    </span>
  );
}
