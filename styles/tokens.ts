// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
// Type scale (1.25 major third, rounded)
export const TXT = { xs: 11, sm: 13, md: 14, lg: 16, xl: 20, xxl: 25, stat: 32 } as const;
export const SP  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const RAD = { sm: 4, md: 6, lg: 8, xl: 12, xxl: 16, full: 9999 } as const;
export const LS  = { tight: "0.04em", normal: "0.06em", wide: "0.1em" } as const;
export const LH  = { tight: 1.2, normal: 1.5, relaxed: 1.65 } as const;

// ─── MOTION ─────────────────────────────────────────────────────────────────
export const MOTION = {
  fast: "100ms", normal: "200ms", slow: "300ms", slower: "500ms",
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeBounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

// ─── SHADOWS ────────────────────────────────────────────────────────────────
export const SHADOW = {
  sm: "0 1px 2px rgba(0,0,0,0.05)",
  md: "0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)",
  lg: "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.05)",
  xl: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
} as const;

// ─── THEME (SimCity × Stripe × Slack) ────────────────────────────────────────
export const FONT = { sans: "'Inter',system-ui,sans-serif", mono: "'IBM Plex Mono','Courier New',monospace" } as const;

export const GRAY = {
  50: "#f9fafb", 100: "#f3f4f6", 200: "#e5e7eb", 300: "#d1d5db",
  400: "#9ca3af", 500: "#6b7280", 600: "#4b5563", 700: "#374151",
  800: "#1f2937", 900: "#111827", 950: "#030712",
} as const;

export const SIDEBAR = { width: 256, collapsedWidth: 48, bg: "#f9fafb", border: "#e5e7eb", hoverBg: "#f3f4f6", activeBg: "#eef1f5" } as const;
export const MAP = { bg: "#0f1219", grid: "rgba(255,255,255,0.03)", nodeBg: "#1a1f2e", nodeBorder: "#2a3048", nodeRadius: 10, labelBg: "rgba(0,0,0,0.55)", text: "#94a3b8", textBright: "#e2e8f0" } as const;
export const DETAIL = { bg: "#ffffff", border: "#e5e7eb", headerBg: "#f9fafb" } as const;
export const CLR = {
  textPrimary: "#111827", textSecondary: "#4b5563", textMuted: "#6b7280",
  textOnDark: "#cbd5e1", textOnDarkBright: "#e5e7eb", borderDefault: "#e5e7eb",
  primary: "#0ea5e9", success: "#22c55e", warning: "#f59e0b", danger: "#ef4444",
  info: "#60a5fa", purple: "#a78bfa",
} as const;

// ─── FOCUS ──────────────────────────────────────────────────────────────────
export const FOCUS = {
  ring: `0 0 0 2px #ffffff, 0 0 0 4px ${CLR.primary}`,
  ringDark: `0 0 0 2px #0f1219, 0 0 0 4px ${CLR.primary}`,
} as const;

// ─── THEME-AWARE VARIABLES (CSS custom properties) ─────────────────────────
// Use these for any color that should switch between light/dark mode.
// Layout tokens (spacing, radius, motion, font-size) stay as static imports.
export const T = {
  bgPrimary: "var(--bg-primary)",
  bgSecondary: "var(--bg-secondary)",
  bgSurface: "var(--bg-surface)",
  bgHover: "var(--bg-hover)",
  bgActive: "var(--bg-active)",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textMuted: "var(--text-muted)",
  borderDefault: "var(--border-default)",
  borderSubtle: "var(--border-subtle)",
  shadowSm: "var(--shadow-sm)",
  shadowMd: "var(--shadow-md)",
} as const;
