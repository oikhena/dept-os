"use client";

import { useState, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { DEPARTMENTS } from "../../../data/templates";
import { compareDepartments, parseSections, type CompareSection } from "../../../lib/ai/compare";
import type { Department } from "../../../types/department";
import { TXT, SP, RAD, LS, LH, FONT, DETAIL, CLR, GRAY, MOTION, T } from "../../../styles/tokens";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";

type Phase = "idle" | "streaming" | "done" | "error";

const SECTION_META: Record<string, { color: string; icon: string }> = {
  "Shared Patterns": { color: CLR.info, icon: "◎" },
  "Key Differences": { color: CLR.warning, icon: "≠" },
  "AI Readiness": { color: CLR.success, icon: "⚡" },
  "Recommended Agents": { color: CLR.purple, icon: "🤖" },
};

function renderLines(content: string, bodyColor: string) {
  return content.split("\n").map((line, i) => {
    const bullet = line.match(/^[-•*]\s+(.*)/);
    if (bullet) {
      return (
        <div key={i} style={{ display: "flex", gap: SP.sm, marginBottom: 6 }}>
          <span style={{ color: bodyColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>·</span>
          <span style={{ fontSize: TXT.md, color: T.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed }}>{bullet[1]}</span>
        </div>
      );
    }
    if (line.trim()) {
      return <p key={i} style={{ fontSize: TXT.md, color: T.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed, margin: "0 0 6px" }}>{line}</p>;
    }
    return null;
  });
}

export default function ComparePage() {
  const { savedDepts } = useApp();

  const allDepts: { key: string; label: string; icon: string; dept: Department }[] = [
    ...Object.entries(DEPARTMENTS).map(([k, d]) => ({ key: k, label: d.label, icon: d.icon || "🏛", dept: d })),
    ...savedDepts.map(s => ({ key: s.id, label: s.department.label, icon: s.department.icon || "✦", dept: s.department })),
  ];

  const [selA, setSelA] = useState(allDepts[0]?.key || "");
  const [selB, setSelB] = useState(allDepts[1]?.key || "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const deptA = allDepts.find(d => d.key === selA)?.dept;
  const deptB = allDepts.find(d => d.key === selB)?.dept;
  const sections: CompareSection[] = parseSections(rawText);

  const canCompare = selA && selB && selA !== selB && deptA && deptB;

  const startCompare = useCallback(async () => {
    if (!deptA || !deptB) return;
    setPhase("streaming");
    setRawText("");
    setError(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      await compareDepartments(deptA, deptB, chunk => setRawText(t => t + chunk), abortRef.current.signal);
      setPhase("done");
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message || "Comparison failed");
        setPhase("error");
      }
    }
  }, [deptA, deptB]);

  const selectStyle: React.CSSProperties = {
    background: T.bgSecondary,
    border: `1px solid ${T.borderDefault}`,
    borderRadius: RAD.md,
    padding: `${SP.sm}px ${SP.md}px`,
    fontSize: TXT.md,
    fontFamily: FONT.sans,
    color: T.textPrimary,
    outline: "none",
    cursor: "pointer",
    width: "100%",
    transition: `border-color ${MOTION.fast}`,
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", fontFamily: FONT.sans }}>

      {/* Header */}
      <div style={{
        background: T.bgPrimary, borderBottom: `1px solid ${T.borderDefault}`,
        padding: `0 ${SP.xl}px`, height: 56, display: "flex", alignItems: "center", gap: SP.md, flexShrink: 0,
      }}>
        <span style={{ fontSize: TXT.xl }}>⇄</span>
        <span style={{ fontWeight: 700, fontSize: TXT.lg, color: T.textPrimary }}>Compare Departments</span>
        <span style={{ fontSize: TXT.xs, color: GRAY[500] }}>AI-powered side-by-side analysis</span>
      </div>

      {/* Picker bar */}
      <div style={{ background: T.bgSecondary, borderBottom: `1px solid ${T.borderDefault}`, padding: `${SP.lg}px ${SP.xl}px`, flexShrink: 0 }}
        role="search" aria-label="Department comparison selector">
        <div style={{ display: "flex", gap: SP.md, alignItems: "flex-end", maxWidth: 800 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: TXT.xs, fontWeight: 600, color: GRAY[500], letterSpacing: LS.wide, marginBottom: SP.xs, display: "block", textTransform: "uppercase" }}>
              Institution A
            </label>
            <select value={selA} onChange={e => setSelA(e.target.value)} style={selectStyle} aria-label="Select first institution">
              {allDepts.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: SP.sm, fontSize: TXT.xl, color: GRAY[400], flexShrink: 0 }}>⇄</div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: TXT.xs, fontWeight: 600, color: GRAY[500], letterSpacing: LS.wide, marginBottom: SP.xs, display: "block", textTransform: "uppercase" }}>
              Institution B
            </label>
            <select value={selB} onChange={e => setSelB(e.target.value)} style={selectStyle} aria-label="Select second institution">
              {allDepts.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
            </select>
          </div>
          <Button variant="primary" size="md" onClick={startCompare}
            disabled={!canCompare || phase === "streaming"}
            loading={phase === "streaming"}
            style={{ flexShrink: 0 }}>
            {phase === "streaming" ? "Analyzing..." : "Compare"}
          </Button>
        </div>

        {/* Department summary chips */}
        {(deptA || deptB) && (
          <div style={{ display: "flex", gap: SP.md, marginTop: SP.md, maxWidth: 800 }}>
            {[deptA, deptB].map((d, i) => d && (
              <div key={i} style={{
                flex: 1, display: "flex", gap: SP.sm, alignItems: "center",
                background: T.bgPrimary, border: `1px solid ${T.borderDefault}`,
                borderRadius: RAD.md, padding: `${SP.sm}px ${SP.md}px`,
              }}>
                <span style={{ fontSize: TXT.lg }}>{d.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: TXT.sm, fontWeight: 600, color: T.textPrimary }}>{d.label}</div>
                  <div style={{ fontSize: TXT.xs, color: GRAY[500] }}>
                    {d.roles?.length || 0} roles · {d.agents?.length || 0} agents{d.infrastructure ? ` · ${d.infrastructure}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: "auto", padding: SP.xl }} role="main">

        {phase === "idle" && (
          <EmptyState
            icon="⇄"
            title="Pick two institutions to compare"
            description="Claude will analyze shared patterns, key differences, AI readiness scores, and recommend agents that work across both."
          />
        )}

        {phase === "streaming" && sections.length === 0 && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: SP.xl }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ flex: 1, height: 3, background: GRAY[200], borderRadius: RAD.full, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: CLR.success, borderRadius: RAD.full, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite alternate`, width: "60%" }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: TXT.sm, color: GRAY[500] }}>Analyzing {deptA?.label} vs {deptB?.label}...</div>
          </div>
        )}

        {error && (
          <div style={{
            background: CLR.danger + "08", border: `1px solid ${CLR.danger}30`,
            borderRadius: RAD.lg, padding: `${SP.md}px ${SP.lg}px`,
            color: CLR.danger, fontSize: TXT.md, maxWidth: 600, margin: "0 auto",
          }}
            role="alert">
            {error}
          </div>
        )}

        {sections.length > 0 && (
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: SP.lg }}>
            {sections.map((section, i) => {
              const meta = SECTION_META[section.title] || { color: GRAY[400], icon: "▸" };
              return (
                <article key={i} style={{
                  background: T.bgPrimary, border: `1px solid ${T.borderDefault}`,
                  borderRadius: RAD.lg, overflow: "hidden",
                }}>
                  <div style={{
                    background: meta.color + "08", borderBottom: `1px solid ${meta.color}20`,
                    padding: `${SP.md}px ${SP.xl}px`, display: "flex", alignItems: "center", gap: SP.sm,
                  }}>
                    <span style={{ fontSize: TXT.lg, color: meta.color }}>{meta.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: TXT.md, color: T.textPrimary }}>{section.title}</span>
                    {phase === "streaming" && i === sections.length - 1 && (
                      <span style={{ marginLeft: "auto", fontSize: TXT.xs, color: GRAY[400] }}>writing...</span>
                    )}
                  </div>
                  <div style={{ padding: `${SP.lg}px ${SP.xl}px` }}>
                    {section.content ? renderLines(section.content, meta.color) : (
                      <div style={{ height: 16, background: GRAY[100], borderRadius: RAD.sm, width: "40%" }} />
                    )}
                  </div>
                </article>
              );
            })}

            {phase === "done" && (
              <div style={{ display: "flex", gap: SP.sm, paddingTop: SP.xs }}>
                <Button variant="secondary" size="sm"
                  onClick={() => {
                    const text = sections.map(s => `## ${s.title}\n${s.content}`).join("\n\n");
                    navigator.clipboard.writeText(text);
                  }}>
                  Copy as Markdown
                </Button>
                <Button variant="ghost" size="sm"
                  onClick={() => { setPhase("idle"); setRawText(""); }}>
                  Reset
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
