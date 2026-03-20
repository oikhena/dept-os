"use client";

import { forwardRef } from "react";
import { FONT, RAD, TXT, MOTION, SHADOW, CLR, GRAY, T } from "../../styles/tokens";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, { bg: string; color: string; border: string; hoverBg: string }> = {
  primary:   { bg: CLR.primary, color: "#ffffff", border: CLR.primary, hoverBg: "#0284c7" },
  secondary: { bg: "transparent", color: T.textSecondary, border: T.borderDefault, hoverBg: T.bgSurface },
  ghost:     { bg: "transparent", color: T.textSecondary, border: "transparent", hoverBg: T.bgSurface },
  danger:    { bg: "#fef2f2", color: CLR.danger, border: "#fecaca", hoverBg: "#fee2e2" },
  success:   { bg: "#f0fdf4", color: CLR.success, border: "#bbf7d0", hoverBg: "#dcfce7" },
};

const sizeStyles: Record<Size, { padding: string; fontSize: number; height: number }> = {
  sm: { padding: "0 10px", fontSize: TXT.sm, height: 30 },
  md: { padding: "0 14px", fontSize: TXT.md, height: 36 },
  lg: { padding: "0 20px", fontSize: TXT.lg, height: 44 },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, icon, children, disabled, style, ...props }, ref) => {
    const v = variantStyles[variant];
    const s = sizeStyles[size];
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          gap: 6, height: s.height, padding: s.padding,
          background: isDisabled ? T.bgSurface : v.bg,
          color: isDisabled ? GRAY[400] : v.color,
          border: `1px solid ${isDisabled ? T.borderDefault : v.border}`,
          borderRadius: RAD.md, cursor: isDisabled ? "default" : "pointer",
          fontSize: s.fontSize, fontFamily: FONT.sans, fontWeight: 600,
          transition: `all ${MOTION.fast} ${MOTION.ease}`,
          whiteSpace: "nowrap", lineHeight: 1,
          ...style,
        }}
        onMouseEnter={e => { if (!isDisabled) (e.currentTarget.style.background = v.hoverBg); }}
        onMouseLeave={e => { if (!isDisabled) (e.currentTarget.style.background = v.bg); }}
        {...props}
      >
        {loading && <Spinner size={s.fontSize} />}
        {icon && !loading && icon}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

function Spinner({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
