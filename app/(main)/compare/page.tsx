"use client";

import { useState, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { DEPARTMENTS } from "../../../data/templates";
import { compareDepartments, parseSections, type CompareSection } from "../../../lib/ai/compare";
import type { Department } from "../../../types/department";
import { TXT, SP, RAD, LS, LH, FONT, DETAIL, CLR } from "../../../styles/tokens";

type Phase = "idle" | "streaming" | "done" | "error";

const SECTION_META: Record<string, { color: string; icon: string }> = {
  "Shared Patterns":   { color: "#60a5fa", icon: "◎" },
  "Key Differences":   { color: "#f59e0b", icon: "≠" },
  "AI Readiness":      { color: "#22c55e", icon: "⚡" },
  "Recommended Agents":{ color: "#a78bfa", icon: "🤖" },
};

function renderLines(content: string, bodyColor: string) {
  return content.split("\n").map((line, i) => {
    const bullet = line.match(/^[-•*]\s+(.*)/);
    if (bullet) {
      return (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <span style={{ color: bodyColor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>·</span>
          <span style={{ fontSize: TXT.md, color: CLR.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed }}>{bullet[1]}</span>
        </div>
      );
    }
    if (line.trim()) {
      return <p key={i} style={{ fontSize: TXT.md, color: CLR.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed, margin: "0 0 6px" }}>{line}</p>;
    }
    return null;
  });
}

export default function ComparePage() {
  const { savedDepts } = useApp();

  // Build unified dept list: built-ins + saved
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

  const selectStyle = {
    background: "#f8f9fb",
    border: `1px solid ${CLR.borderDefault}`,
    borderRadius: RAD.md,
    padding: "8px 12px",
    fontSize: TXT.md,
    fontFamily: FONT.sans,
    color: CLR.textPrimary,
    outline: "none",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ background: DETAIL.bg, borderBottom: `1px solid ${CLR.borderDefault}`, padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 18 }}>⇄</span>
        <span style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 15, color: CLR.textPrimary }}>Compare Departments</span>
        <span style={{ fontSize: 11, color: CLR.textMuted, fontFamily: FONT.sans }}>AI-powered side-by-side analysis</span>
      </div>

      {/* Picker bar */}
      <div style={{ background: "#f8f9fb", borderBottom: `1px solid ${CLR.borderDefault}`, padding: "14px 24px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", maxWidth: 800 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontFamily: FONT.sans, fontWeight: 600, color: CLR.textMuted, letterSpacing: LS.wide, marginBottom: 5 }}>INSTITUTION A</div>
            <select value={selA} onChange={e => setSelA(e.target.value)} style={selectStyle}>
              {allDepts.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: 10, fontSize: 18, color: CLR.textMuted, flexShrink: 0 }}>⇄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontFamily: FONT.sans, fontWeight: 600, color: CLR.textMuted, letterSpacing: LS.wide, marginBottom: 5 }}>INSTITUTION B</div>
            <select value={selB} onChange={e => setSelB(e.target.value)} style={selectStyle}>
              {allDepts.map(d => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
            </select>
          </div>
          <button
            onClick={startCompare}
            disabled={!canCompare || phase === "streaming"}
            style={{ background: canCompare && phase !== "streaming" ? "#111827" : CLR.borderDefault, color: canCompare && phase !== "streaming" ? "#ffffff" : CLR.textMuted, border: "none", borderRadius: RAD.md, padding: "9px 20px", cursor: canCompare && phase !== "streaming" ? "pointer" : "default", fontSize: TXT.md, fontFamily: FONT.sans, fontWeight: 600, flexShrink: 0, transition: "background 0.15s" }}>
            {phase === "streaming" ? "Analyzing…" : "Compare →"}
          </button>
        </div>

        {/* Department summary chips */}
        {(deptA || deptB) && (
          <div style={{ display: "flex", gap: 10, marginTop: 12, maxWidth: 800 }}>
            {[deptA, deptB].map((d, i) => d && (
              <div key={i} style={{ flex: 1, display: "flex", gap: 8, alignItems: "center", background: "#ffffff", border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.md, padding: "7px 12px" }}>
                <span style={{ fontSize: 16 }}>{d.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: CLR.textPrimary, fontFamily: FONT.sans }}>{d.label}</div>
                  <div style={{ fontSize: 10, color: CLR.textMuted, fontFamily: FONT.sans }}>{d.roles?.length || 0} roles · {d.agents?.length || 0} agents{d.infrastructure ? ` · ${d.infrastructure}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

        {phase === "idle" && (
          <div style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: SP.lg }}>⇄</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: CLR.textPrimary, fontFamily: FONT.sans, marginBottom: SP.sm }}>Pick two institutions to compare</div>
            <div style={{ fontSize: TXT.md, color: CLR.textMuted, fontFamily: FONT.sans, lineHeight: LH.relaxed }}>
              Claude will analyze shared patterns, key differences, AI readiness scores, and recommend agents that work across both.
            </div>
          </div>
        )}

        {phase === "streaming" && sections.length === 0 && (
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: SP.xl }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ flex: 1, height: 3, background: "#f0f2f5", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#22c55e", borderRadius: 2, animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite alternate`, width: "60%" }} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: TXT.sm, color: CLR.textMuted, fontFamily: FONT.sans }}>Analyzing {deptA?.label} vs {deptB?.label}…</div>
          </div>
        )}

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: RAD.md, padding: "12px 16px", color: "#ef4444", fontFamily: FONT.sans, fontSize: TXT.md, maxWidth: 600, margin: "0 auto" }}>
            {error}
          </div>
        )}

        {sections.length > 0 && (
          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {sections.map((section, i) => {
              const meta = SECTION_META[section.title] || { color: "#94a3b8", icon: "▸" };
              return (
                <div key={i} style={{ background: "#ffffff", border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.lg, overflow: "hidden" }}>
                  <div style={{ background: meta.color + "08", borderBottom: `1px solid ${meta.color}20`, padding: "12px 20px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16, color: meta.color }}>{meta.icon}</span>
                    <span style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: TXT.md, color: CLR.textPrimary }}>{section.title}</span>
                    {phase === "streaming" && i === sections.length - 1 && (
                      <span style={{ marginLeft: "auto", fontSize: 10, color: CLR.textMuted, fontFamily: FONT.sans }}>writing…</span>
                    )}
                  </div>
                  <div style={{ padding: "14px 20px" }}>
                    {section.content ? renderLines(section.content, meta.color) : (
                      <div style={{ height: 16, background: "#f0f2f5", borderRadius: 4, width: "40%" }} />
                    )}
                  </div>
                </div>
              );
            })}

            {phase === "done" && (
              <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                <button
                  onClick={() => {
                    const text = sections.map(s => `## ${s.title}\n${s.content}`).join("\n\n");
                    navigator.clipboard.writeText(text);
                  }}
                  style={{ background: "transparent", border: `1px solid ${CLR.borderDefault}`, color: CLR.textSecondary, borderRadius: RAD.md, padding: "7px 14px", cursor: "pointer", fontSize: TXT.sm, fontFamily: FONT.sans }}>
                  Copy as Markdown
                </button>
                <button
                  onClick={() => { setPhase("idle"); setRawText(""); }}
                  style={{ background: "transparent", border: `1px solid ${CLR.borderDefault}`, color: CLR.textMuted, borderRadius: RAD.md, padding: "7px 14px", cursor: "pointer", fontSize: TXT.sm, fontFamily: FONT.sans }}>
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
