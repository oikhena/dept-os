"use client";

import { FONT, RAD, SP, T, TXT } from "../../styles/tokens";
import type { KnowledgeWork, Role } from "../../types/department";

interface Props {
  knowledgeWork: KnowledgeWork[];
  roles: Role[];
  accentColor: string;
}

export function EffortByRoleChart({ knowledgeWork, roles, accentColor }: Props) {
  if (!knowledgeWork.length) return null;

  // Group tasks by role and sum effort
  const effortByRole: Record<string, number> = {};
  for (const kw of knowledgeWork) {
    effortByRole[kw.role] = (effortByRole[kw.role] || 0) + kw.effort;
  }

  // Build role map for labels and icons
  const roleMap: Record<string, Role> = {};
  for (const r of roles) {
    roleMap[r.id] = r;
  }

  // Sort by total effort descending
  const sorted = Object.entries(effortByRole)
    .map(([roleId, totalEffort]) => ({
      roleId,
      totalEffort,
      label: roleMap[roleId]?.label ?? roleId,
      icon: roleMap[roleId]?.icon ?? "👤",
    }))
    .sort((a, b) => b.totalEffort - a.totalEffort);

  const maxEffort = sorted[0]?.totalEffort ?? 1;
  const rowHeight = 36;
  const svgHeight = sorted.length * rowHeight + 10;
  const barStartX = 100;
  const barMaxWidth = 150;
  const valueX = 272;

  return (
    <div
      style={{
        background: T.bgPrimary,
        border: `1px solid ${T.borderDefault}`,
        borderRadius: RAD.lg,
        padding: SP.lg,
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontSize: TXT.xs,
          color: T.textMuted,
          marginBottom: SP.sm,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Effort by Role
      </div>
      <svg
        viewBox={`0 0 300 ${svgHeight}`}
        width="100%"
        style={{ display: "block" }}
      >
        {sorted.map((row, i) => {
          const y = i * rowHeight + 18;
          const barWidth = (row.totalEffort / maxEffort) * barMaxWidth;
          const opacity = 0.4 + 0.6 * (row.totalEffort / maxEffort);

          return (
            <g key={row.roleId}>
              {/* Icon */}
              <text
                x={2}
                y={y}
                fontSize={13}
                dominantBaseline="central"
              >
                {row.icon}
              </text>

              {/* Label */}
              <text
                x={20}
                y={y}
                fontSize={10}
                fontFamily={FONT.mono}
                fill={T.textSecondary}
                dominantBaseline="central"
              >
                {row.label.length > 14
                  ? row.label.slice(0, 14) + "…"
                  : row.label}
              </text>

              {/* Bar */}
              <rect
                x={barStartX}
                y={y - 8}
                width={barWidth}
                height={16}
                rx={3}
                fill={accentColor}
                opacity={opacity}
              />

              {/* Value */}
              <text
                x={valueX}
                y={y}
                fontSize={10}
                fontFamily={FONT.mono}
                fill={T.textPrimary}
                dominantBaseline="central"
                textAnchor="end"
              >
                {row.totalEffort}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
