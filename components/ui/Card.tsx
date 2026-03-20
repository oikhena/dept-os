"use client";

import { RAD, SHADOW, GRAY, T } from "../../styles/tokens";

interface CardProps {
  children: React.ReactNode;
  accentColor?: string;
  padding?: number | string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ children, accentColor, padding = 16, style, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: T.bgPrimary,
        border: `1px solid ${accentColor ? accentColor + "30" : T.borderDefault}`,
        borderRadius: RAD.lg,
        padding,
        boxShadow: T.shadowSm,
        cursor: onClick ? "pointer" : undefined,
        transition: "box-shadow 0.15s, border-color 0.15s",
        ...style,
      }}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.boxShadow = T.shadowMd;
          e.currentTarget.style.borderColor = accentColor || GRAY[300];
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          e.currentTarget.style.boxShadow = T.shadowSm;
          e.currentTarget.style.borderColor = accentColor ? accentColor + "30" : T.borderDefault;
        }
      }}
    >
      {children}
    </div>
  );
}
