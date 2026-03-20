"use client";

import { forwardRef } from "react";
import { RAD, MOTION, GRAY, CLR, T } from "../../styles/tokens";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: number;
  variant?: "default" | "ghost" | "danger";
  label: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ size = 32, variant = "default", label, children, style, ...props }, ref) => {
    const isGhost = variant === "ghost";
    const isDanger = variant === "danger";
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: size, height: size, minWidth: size, minHeight: size,
          background: "transparent",
          border: isGhost ? "none" : `1px solid ${T.borderDefault}`,
          borderRadius: RAD.md,
          color: isDanger ? CLR.danger : GRAY[500],
          cursor: "pointer", padding: 0,
          transition: `all ${MOTION.fast} ${MOTION.ease}`,
          fontSize: Math.round(size * 0.45),
          lineHeight: 1,
          ...style,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = isDanger ? "#fef2f2" : T.bgSurface;
          if (isDanger) e.currentTarget.style.color = "#dc2626";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "transparent";
          if (isDanger) e.currentTarget.style.color = CLR.danger;
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";
