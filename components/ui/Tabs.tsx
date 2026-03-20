"use client";

import { FONT, TXT, RAD, MOTION, CLR, GRAY, T } from "../../styles/tokens";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  accentColor?: string;
}

export function Tabs({ tabs, active, onChange, accentColor = CLR.primary }: TabsProps) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex", alignItems: "center", gap: 0,
        borderBottom: `1px solid ${T.borderDefault}`,
        background: T.bgSecondary,
        padding: "0 16px",
        flexShrink: 0,
      }}
    >
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            style={{
              background: "transparent", border: "none",
              borderBottom: `2px solid ${isActive ? accentColor : "transparent"}`,
              color: isActive ? accentColor : T.textMuted,
              padding: "10px 16px",
              cursor: "pointer",
              fontSize: TXT.sm,
              fontFamily: FONT.sans,
              fontWeight: isActive ? 600 : 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              transition: `color ${MOTION.fast} ${MOTION.ease}`,
              display: "flex", alignItems: "center", gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                fontSize: TXT.xs, fontWeight: 600,
                background: isActive ? accentColor + "15" : T.bgSurface,
                color: isActive ? accentColor : GRAY[400],
                padding: "1px 6px", borderRadius: RAD.full,
                lineHeight: "1.4",
              }}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
