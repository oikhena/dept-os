"use client";

import { CLR, FONT, RAD, SP, T, TXT } from "../../styles/tokens";
import type { KnowledgeWork } from "../../types/department";

interface Props {
  knowledgeWork: KnowledgeWork[];
}

function parseCostValue(costStr?: string): number | null {
  if (!costStr) return null;
  const match = costStr.match(/\$(\d+(?:\.\d+)?)\s*(K)?/i);
  if (!match) return null;
  const val = parseFloat(match[1]);
  const isK = !!match[2];
  return isK ? val : val / 1000; // Normalize to K
}

function formatCost(k: number): string {
  if (k >= 1000) return `$${Math.round(k / 1000)}M`;
  return `$${Math.round(k)}K`;
}

export function CostByTaskChart({ knowledgeWork }: Props) {
  const hasCitations = knowledgeWork.some(kw => kw.salarySource);
  if (!knowledgeWork.length) return null;

  // Parse costs and separate into costed vs uncosted
  const withCost: {
    kw: KnowledgeWork;
    costK: number;
  }[] = [];
  const withoutCost: KnowledgeWork[] = [];

  for (const kw of knowledgeWork) {
    const costK = parseCostValue(kw.costPerYear);
    if (costK !== null && costK > 0) {
      withCost.push({ kw, costK });
    } else {
      withoutCost.push(kw);
    }
  }

  // If all costs missing, return null
  if (withCost.length === 0) return null;

  // Sort by cost descending
  withCost.sort((a, b) => b.costK - a.costK);

  const maxCost = withCost[0]?.costK ?? 1;
  const allRows = [
    ...withCost.map((wc) => ({
      label: wc.kw.label,
      costK: wc.costK,
      aiImpact: wc.kw.aiImpact,
      hasCost: true as const,
    })),
    ...withoutCost.map((kw) => ({
      label: kw.label,
      costK: 0,
      aiImpact: kw.aiImpact,
      hasCost: false as const,
    })),
  ];

  const rowHeight = 36;
  const svgHeight = allRows.length * rowHeight + 10 + (hasCitations ? 14 : 0);
  const barStartX = 100;
  const barMaxWidth = 145;
  const valueX = 293;

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
        Annual Cost by Task
      </div>
      <svg
        viewBox={`0 0 300 ${svgHeight}`}
        width="100%"
        style={{ display: "block" }}
      >
        {hasCitations && (
          <text x={2} y={svgHeight - 2} fontSize={7} fill={T.textMuted} fontFamily={FONT.mono}>
            Source: BLS OEWS 2024
          </text>
        )}
        {allRows.map((row, i) => {
          const y = i * rowHeight + 18;
          const barWidth = row.hasCost
            ? (row.costK / maxCost) * barMaxWidth
            : barMaxWidth * 0.08;
          const barColor = row.hasCost
            ? row.aiImpact === "supercharge"
              ? CLR.success
              : CLR.warning
            : "#9ca3af";
          const truncatedLabel =
            row.label.length > 25
              ? row.label.slice(0, 24) + "…"
              : row.label;

          return (
            <g key={`${row.label}-${i}`}>
              {/* Task label */}
              <text
                x={2}
                y={y}
                fontSize={9}
                fontFamily={FONT.mono}
                fill={T.textSecondary}
                dominantBaseline="central"
              >
                {truncatedLabel}
              </text>

              {/* Bar */}
              <rect
                x={barStartX}
                y={y - 8}
                width={barWidth}
                height={16}
                rx={3}
                fill={barColor}
                opacity={row.hasCost ? 0.8 : 0.3}
              />

              {/* Cost value */}
              <text
                x={valueX}
                y={y}
                fontSize={10}
                fontFamily={FONT.mono}
                fill={row.hasCost ? T.textPrimary : T.textMuted}
                dominantBaseline="central"
                textAnchor="end"
              >
                {row.hasCost ? formatCost(row.costK) : "—"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
