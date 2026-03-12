"use client";

import { useEffect, useRef, useState } from "react";
import type { Department } from "../../types/department";
import { generateReport } from "../../lib/ai/report";
import { parseSections } from "../../lib/ai/compare";
import { TXT, SP, RAD, LH, FONT, CLR } from "../../styles/tokens";

interface Props {
  dept: Department;
  onClose: () => void;
}

type Phase = "idle" | "streaming" | "done" | "error";

const SECTION_META: Record<string, { color: string; icon: string }> = {
  "Executive Summary":       { color: "#111827", icon: "◎" },
  "Current State Analysis":  { color: "#f59e0b", icon: "⚠" },
  "Top AI Opportunities":    { color: "#22c55e", icon: "⚡" },
  "Agent Roadmap":           { color: "#60a5fa", icon: "🤖" },
  "Infrastructure & Risk":   { color: "#ef4444", icon: "📶" },
  "Next Steps":              { color: "#a78bfa", icon: "→" },
};

function renderLines(content: string, color: string) {
  return content.split("\n").map((line, i) => {
    const bullet = line.match(/^[-•*\d+\.]\s+(.*)/);
    const numbered = line.match(/^(\d+)\.\s+(.*)/);
    if (numbered) {
      return (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <span style={{ color, fontWeight: 700, fontFamily: FONT.mono, fontSize: TXT.sm, flexShrink: 0, width: 18 }}>{numbered[1]}.</span>
          <span style={{ fontSize: TXT.md, color: CLR.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed }}>{numbered[2]}</span>
        </div>
      );
    }
    if (bullet) {
      return (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <span style={{ color, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>·</span>
          <span style={{ fontSize: TXT.md, color: CLR.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed }}>{bullet[1]}</span>
        </div>
      );
    }
    if (line.trim()) {
      return <p key={i} style={{ fontSize: TXT.md, color: CLR.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed, margin: "0 0 8px" }}>{line}</p>;
    }
    return null;
  });
}

export default function ReportModal({ dept, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [rawText, setRawText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const sections = parseSections(rawText);

  // Auto-start on mount
  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase("streaming");
    generateReport(
      dept,
      chunk => setRawText(t => t + chunk),
      ctrl.signal
    ).then(() => setPhase("done"))
      .catch(err => {
        if (err.name !== "AbortError") {
          setError(err.message || "Report generation failed");
          setPhase("error");
        }
      });
    return () => ctrl.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const copyMarkdown = () => {
    const md = `# ${dept.icon} ${dept.label} — AI Transformation Briefing\n\n` +
      sections.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n");
    navigator.clipboard.writeText(md);
  };

  const printReport = () => window.print();

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #report-print-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; background: white; z-index: 99999; }
          .report-modal-backdrop { background: white !important; }
          .report-no-print { display: none !important; }
        }
        @media screen {
          #report-print-root { display: contents; }
        }
      `}</style>

      <div id="report-print-root">
        <div className="report-modal-backdrop" onClick={handleBackdrop}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, overflowY: "auto", padding: "40px 20px" }}>

          <div ref={printRef} style={{ background: "#ffffff", borderRadius: RAD.lg, width: "100%", maxWidth: 720, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden" }}>

            {/* Modal header */}
            <div className="report-no-print" style={{ padding: "16px 24px", borderBottom: `1px solid ${CLR.borderDefault}`, display: "flex", alignItems: "center", gap: 12, background: "#f8f9fb" }}>
              <span style={{ fontSize: 22 }}>{dept.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: CLR.textPrimary, fontFamily: FONT.sans }}>{dept.label}</div>
                <div style={{ fontSize: 11, color: CLR.textMuted, fontFamily: FONT.sans }}>AI Transformation Briefing · {today}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {phase === "done" && (
                  <>
                    <button onClick={copyMarkdown}
                      style={{ background: "transparent", border: `1px solid ${CLR.borderDefault}`, color: CLR.textSecondary, borderRadius: RAD.md, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontFamily: FONT.sans }}>
                      Copy MD
                    </button>
                    <button onClick={printReport}
                      style={{ background: "#111827", color: "#ffffff", border: "none", borderRadius: RAD.md, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontFamily: FONT.sans, fontWeight: 600 }}>
                      ↓ Print / PDF
                    </button>
                  </>
                )}
                <button onClick={onClose}
                  style={{ background: "transparent", border: "none", color: CLR.textMuted, cursor: "pointer", fontSize: 18, padding: "2px 6px", lineHeight: 1 }}>✕</button>
              </div>
            </div>

            {/* Report print header (visible only when printing) */}
            <div style={{ padding: "32px 40px 0", display: "none" }} className="report-print-header">
              <div style={{ fontSize: 11, color: CLR.textMuted, fontFamily: FONT.sans, marginBottom: 4 }}>DEPT.OS · AI Transformation Briefing · {today}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: CLR.textPrimary, fontFamily: FONT.sans, marginBottom: 4 }}>{dept.icon} {dept.label}</div>
              {dept.region && <div style={{ fontSize: 13, color: CLR.textMuted, fontFamily: FONT.sans }}>{dept.region}</div>}
            </div>

            {/* Content */}
            <div style={{ padding: "24px 32px", minHeight: 400 }}>

              {/* Streaming progress */}
              {phase === "streaming" && sections.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "20px 0" }}>
                  <div style={{ fontSize: TXT.sm, color: CLR.textMuted, fontFamily: FONT.sans }}>Generating executive briefing…</div>
                  {[80, 60, 40, 50, 35].map((w, i) => (
                    <div key={i} style={{ height: 10, background: "#f0f2f5", borderRadius: 4, width: `${w}%`, animation: `shimmer 1.5s ease-in-out ${i * 0.15}s infinite alternate` }} />
                  ))}
                </div>
              )}

              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: RAD.md, padding: "12px 16px", color: "#ef4444", fontFamily: FONT.sans, fontSize: TXT.md }}>
                  {error}
                </div>
              )}

              {/* Sections */}
              {sections.map((section, i) => {
                const meta = SECTION_META[section.title] || { color: "#94a3b8", icon: "▸" };
                return (
                  <div key={i} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${meta.color}20` }}>
                      <span style={{ fontSize: 14, color: meta.color }}>{meta.icon}</span>
                      <span style={{ fontFamily: FONT.sans, fontWeight: 700, fontSize: 13, color: CLR.textPrimary, letterSpacing: "0.02em" }}>{section.title}</span>
                      {phase === "streaming" && i === sections.length - 1 && (
                        <span style={{ marginLeft: "auto", fontSize: 10, color: CLR.textMuted, fontFamily: FONT.sans }}>writing…</span>
                      )}
                    </div>
                    <div>
                      {section.content ? renderLines(section.content, meta.color) : (
                        <div style={{ height: 12, background: "#f0f2f5", borderRadius: 3, width: "30%" }} />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Footer stats */}
              {phase === "done" && (
                <div style={{ borderTop: `1px solid ${CLR.borderDefault}`, paddingTop: 16, marginTop: 8, display: "flex", gap: 20 }}>
                  {[
                    { label: "ROLES", value: dept.roles?.length || 0, color: dept.color || "#00b4d8" },
                    { label: "WORKFLOWS", value: dept.workflows?.length || 0, color: "#60a5fa" },
                    { label: "AI TASKS", value: dept.knowledgeWork?.length || 0, color: "#22c55e" },
                    { label: "AGENTS", value: dept.agents?.length || 0, color: "#f59e0b" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: s.color, fontFamily: FONT.mono }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: CLR.textMuted, fontFamily: FONT.sans, letterSpacing: "0.1em" }}>{s.label}</div>
                    </div>
                  ))}
                  <div style={{ marginLeft: "auto", fontSize: 10, color: CLR.textMuted, fontFamily: FONT.sans, alignSelf: "flex-end" }}>
                    Generated by DEPT.OS
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          from { opacity: 0.4; }
          to { opacity: 0.8; }
        }
        @media print {
          .report-print-header { display: block !important; }
        }
      `}</style>
    </>
  );
}
