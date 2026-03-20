"use client";

import { CLR, FONT, RAD, SP, T, TXT } from "../../styles/tokens";
import type { KnowledgeWork } from "../../types/department";

interface Props {
  knowledgeWork: KnowledgeWork[];
}

function parseCostK(costStr?: string): number {
  if (!costStr) return 0;
  const match = costStr.match(/\$(\d+(?:\.\d+)?)\s*K?/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  // If the string contains "K" (case-insensitive), the number is already in thousands
  // If no K, treat as raw dollars and convert to K
  if (/K/i.test(costStr)) return val;
  return val / 1000;
}

export function AIImpactDonut({ knowledgeWork }: Props) {
  if (!knowledgeWork.length) return null;

  const superchargeItems = knowledgeWork.filter(
    (kw) => kw.aiImpact === "supercharge"
  );
  const shortcircuitItems = knowledgeWork.filter(
    (kw) => kw.aiImpact === "shortcircuit"
  );

  const superchargeCount = superchargeItems.length;
  const shortcircuitCount = shortcircuitItems.length;
  const totalCount = superchargeCount + shortcircuitCount;

  if (totalCount === 0) return null;

  const superchargeCostK = superchargeItems.reduce(
    (sum, kw) => sum + parseCostK(kw.costPerYear),
    0
  );
  const shortcircuitCostK = shortcircuitItems.reduce(
    (sum, kw) => sum + parseCostK(kw.costPerYear),
    0
  );

  // Donut geometry
  const cx = 75;
  const cy = 75;
  const radius = 40;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  const superchargeArc =
    totalCount > 0 ? (superchargeCount / totalCount) * circumference : 0;
  const shortcircuitArc =
    totalCount > 0 ? (shortcircuitCount / totalCount) * circumference : 0;

  // Offset for second arc: starts after the first arc
  const shortcircuitOffset = circumference - superchargeArc;

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
        AI Impact Breakdown
      </div>

      <svg viewBox="0 0 150 150" width="100%" style={{ display: "block" }}>
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={T.textMuted}
          strokeWidth={strokeWidth}
          opacity={0.1}
        />

        {/* Arcs group, rotated so start is at 12 o'clock */}
        <g style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}>
          {/* Supercharge segment (green) */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={CLR.success}
            strokeWidth={strokeWidth}
            strokeDasharray={`${superchargeArc} ${circumference - superchargeArc}`}
            strokeDashoffset={0}
            strokeLinecap="round"
          />

          {/* Shortcircuit segment (amber) */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={CLR.warning}
            strokeWidth={strokeWidth}
            strokeDasharray={`${shortcircuitArc} ${circumference - shortcircuitArc}`}
            strokeDashoffset={shortcircuitOffset}
            strokeLinecap="round"
          />
        </g>

        {/* Center text: total count */}
        <text
          x={cx}
          y={cy - 5}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={18}
          fontFamily={FONT.mono}
          fontWeight={700}
          fill={T.textPrimary}
        >
          {totalCount}
        </text>
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fontFamily={FONT.mono}
          fill={T.textMuted}
        >
          tasks
        </text>
      </svg>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: SP.xs,
          marginTop: SP.md,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: SP.sm,
            fontFamily: FONT.mono,
            fontSize: TXT.xs,
            color: T.textSecondary,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: CLR.success,
              flexShrink: 0,
            }}
          />
          <span>
            {superchargeCount} supercharge
            {superchargeCostK > 0 && (
              <span style={{ color: T.textMuted, marginLeft: SP.xs }}>
                ~${Math.round(superchargeCostK)}K potential
              </span>
            )}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: SP.sm,
            fontFamily: FONT.mono,
            fontSize: TXT.xs,
            color: T.textSecondary,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: CLR.warning,
              flexShrink: 0,
            }}
          />
          <span>
            {shortcircuitCount} shortcircuit
            {shortcircuitCostK > 0 && (
              <span style={{ color: T.textMuted, marginLeft: SP.xs }}>
                ~${Math.round(shortcircuitCostK)}K potential
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
