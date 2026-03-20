export const metadata = {
  title: "DEPT.OS",
  description: "AI Workflow + Agent Analyzer",
};

const globalStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

  /* ─── Theme: CSS Custom Properties ─── */
  :root, [data-theme="light"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f9fafb;
    --bg-surface: #f3f4f6;
    --bg-hover: #f3f4f6;
    --bg-active: #eef1f5;
    --text-primary: #111827;
    --text-secondary: #4b5563;
    --text-muted: #6b7280;
    --border-default: #e5e7eb;
    --border-subtle: #f3f4f6;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
    --scrollbar-thumb: #d1d5db;
    --scrollbar-hover: #9ca3af;
    --focus-ring: #0ea5e9;
    --focus-bg: #ffffff;
    color-scheme: light;
  }
  [data-theme="dark"] {
    --bg-primary: #0f1219;
    --bg-secondary: #161b26;
    --bg-surface: #1e2433;
    --bg-hover: #242b3d;
    --bg-active: #2a3348;
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --border-default: #2a3048;
    --border-subtle: #1e2433;
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -2px rgba(0,0,0,0.3);
    --scrollbar-thumb: #374151;
    --scrollbar-hover: #4b5563;
    --focus-ring: #0ea5e9;
    --focus-bg: #0f1219;
    color-scheme: dark;
  }

  /* Focus styling */
  :focus { outline: none; }
  :focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
    border-radius: 4px;
  }
  button:focus-visible, [role="button"]:focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-hover); }

  /* Skeleton shimmer animation */
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Slide in from right */
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  /* Fade in */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* Scale up (for modals) */
  @keyframes scaleUp {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  /* Pulse */
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
