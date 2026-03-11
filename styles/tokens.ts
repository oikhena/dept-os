// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
export const TXT = { xs: 8, sm: 10, md: 12, lg: 14, xl: 18, stat: 24 } as const;
export const SP  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
export const RAD = { sm: 3, md: 5, lg: 8, xl: 12 } as const;
export const LS  = { tight: "0.04em", normal: "0.06em", wide: "0.1em" } as const;
export const LH  = { tight: 1.3, normal: 1.5, relaxed: 1.7 } as const;

// ─── THEME (SimCity × Stripe × Slack) ────────────────────────────────────────
export const FONT = { sans: "'Inter',system-ui,sans-serif", mono: "'IBM Plex Mono','Courier New',monospace" } as const;
export const SIDEBAR = { width: 232, bg: "#f8f9fb", border: "#e5e7eb", hoverBg: "#f0f2f5", activeBg: "#eef1f5" } as const;
export const MAP = { bg: "#131620", grid: "rgba(255,255,255,0.035)", nodeBg: "#1e2235", nodeBorder: "#2d3250", nodeRadius: 10, labelBg: "rgba(0,0,0,0.55)" } as const;
export const DETAIL = { bg: "#ffffff", border: "#e5e7eb", headerBg: "#f8f9fb" } as const;
export const CLR = { textPrimary: "#111827", textSecondary: "#6b7280", textMuted: "#9ca3af", textOnDark: "#cbd5e1", textOnDarkBright: "#e5e7eb", borderDefault: "#e5e7eb" } as const;
