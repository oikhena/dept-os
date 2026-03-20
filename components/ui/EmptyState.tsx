"use client";

import { FONT, TXT, SP, LH, GRAY, T } from "../../styles/tokens";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: `${SP.xxxl}px ${SP.xl}px`,
      textAlign: "center",
      minHeight: 200,
    }}>
      <div style={{ fontSize: 40, marginBottom: SP.lg, opacity: 0.6 }}>{icon}</div>
      <div style={{
        fontSize: TXT.lg, fontWeight: 600, color: T.textPrimary,
        fontFamily: FONT.sans, marginBottom: SP.sm,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: TXT.md, color: T.textMuted, fontFamily: FONT.sans,
        lineHeight: LH.relaxed, maxWidth: 360, marginBottom: action ? SP.xl : 0,
      }}>
        {description}
      </div>
      {action}
    </div>
  );
}
