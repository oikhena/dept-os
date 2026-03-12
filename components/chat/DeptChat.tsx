"use client";

import { useEffect, useRef, useState } from "react";
import type { Department } from "../../types/department";
import { useChat } from "../../hooks/useChat";
import { buildChatSystemPrompt } from "../../lib/ai/prompts";
import { refineDepartment } from "../../lib/ai/refine";
import { TXT, SP, RAD, LH, FONT, CLR, DETAIL } from "../../styles/tokens";

interface Props {
  dept: Department;
  accentColor: string;
  savedDeptId?: string;
  onClose: () => void;
  onRefinement: (refined: Department) => void;
}

type Mode = "chat" | "refine";
type RefinePhase = "idle" | "streaming" | "ready" | "error";

export default function DeptChat({ dept, accentColor, savedDeptId, onClose, onRefinement }: Props) {
  const systemPrompt = buildChatSystemPrompt(dept);
  const { messages, sendMessage, isLoading: chatLoading, reset } = useChat(systemPrompt, savedDeptId);

  const [mode, setMode] = useState<Mode>("chat");

  // Chat state
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Refine state
  const [refineInput, setRefineInput] = useState("");
  const [refinePhase, setRefinePhase] = useState<RefinePhase>("idle");
  const [refineProgress, setRefineProgress] = useState(0); // chars streamed
  const [refinedDept, setRefinedDept] = useState<Department | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);
  const refineAbortRef = useRef<AbortController | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { reset(); setRefinedDept(null); setRefinePhase("idle"); }, [dept.label]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitChat = () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput("");
    sendMessage(text);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const startRefine = async () => {
    const instruction = refineInput.trim();
    if (!instruction) return;
    setRefinePhase("streaming");
    setRefinedDept(null);
    setRefineProgress(0);
    setRefineError(null);
    refineAbortRef.current?.abort();
    refineAbortRef.current = new AbortController();
    try {
      const result = await refineDepartment(
        dept,
        instruction,
        (acc, partial) => {
          setRefineProgress(acc.length);
          if (partial) setRefinedDept(partial);
        },
        refineAbortRef.current.signal
      );
      setRefinedDept(result);
      setRefinePhase("ready");
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        setRefineError((err as Error).message || "Refinement failed");
        setRefinePhase("error");
      }
    }
  };

  const applyRefinement = () => {
    if (refinedDept) {
      onRefinement(refinedDept);
      setRefinePhase("idle");
      setRefineInput("");
      setRefinedDept(null);
    }
  };

  const cancelRefine = () => {
    refineAbortRef.current?.abort();
    setRefinePhase("idle");
    setRefinedDept(null);
    setRefineError(null);
  };

  const starters = [
    "What's the biggest bottleneck here?",
    "Which agent should we build first?",
    "Where are the highest cost leaks?",
    "What would change if this was rural?",
  ];

  const refineExamples = [
    "Make this a rural, low-connectivity version",
    "Shift focus to emergency response workflows",
    "Add a procurement and supply chain dimension",
    "Optimize for a 3x smaller team",
  ];

  const progressPct = refinePhase === "streaming" ? Math.min(95, (refineProgress / 3000) * 100) : refinePhase === "ready" ? 100 : 0;

  return (
    <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${CLR.borderDefault}`, background: DETAIL.bg, height: "100%" }}>

      {/* Header */}
      <div style={{ padding: "0 16px", height: 52, display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${CLR.borderDefault}`, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: accentColor + "18", border: `1px solid ${accentColor}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
          {dept.icon}
        </div>
        {/* Mode tabs */}
        <div style={{ flex: 1, display: "flex", gap: 0, background: "#f0f2f5", borderRadius: RAD.md, padding: 2 }}>
          {(["chat", "refine"] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex: 1, background: mode === m ? "#ffffff" : "transparent", border: "none", borderRadius: RAD.sm, padding: "4px 0", cursor: "pointer", fontSize: 11, fontFamily: FONT.sans, fontWeight: mode === m ? 600 : 500, color: mode === m ? CLR.textPrimary : CLR.textMuted, transition: "all 0.12s", boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
              {m === "chat" ? "💬 Chat" : "✦ Refine"}
            </button>
          ))}
        </div>
        {mode === "chat" && messages.length > 0 && (
          <button onClick={reset} style={{ background: "transparent", border: "none", color: CLR.textMuted, cursor: "pointer", fontSize: 11, fontFamily: FONT.sans, padding: "3px 6px", borderRadius: RAD.sm }}>clear</button>
        )}
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: CLR.textMuted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 4px" }}>✕</button>
      </div>

      {/* ── CHAT MODE ── */}
      {mode === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.length === 0 && (
              <div>
                <div style={{ fontSize: TXT.sm, color: CLR.textMuted, fontFamily: FONT.sans, marginBottom: 14, lineHeight: LH.relaxed }}>
                  Ask anything about this institution — roles, workflows, AI opportunities, cost leaks, or how to prioritize.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {starters.map(s => (
                    <button key={s} onClick={() => sendMessage(s)}
                      style={{ background: "#f8f9fb", border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.md, padding: "7px 12px", cursor: "pointer", textAlign: "left", fontSize: TXT.sm, color: CLR.textSecondary, fontFamily: FONT.sans, lineHeight: LH.normal, transition: "border-color 0.12s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = accentColor + "60")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = CLR.borderDefault)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "88%",
                  background: msg.role === "user" ? accentColor : "#f8f9fb",
                  color: msg.role === "user" ? "#ffffff" : CLR.textPrimary,
                  border: msg.role === "user" ? "none" : `1px solid ${CLR.borderDefault}`,
                  borderRadius: msg.role === "user" ? `${RAD.lg}px ${RAD.lg}px ${RAD.sm}px ${RAD.lg}px` : `${RAD.lg}px ${RAD.lg}px ${RAD.lg}px ${RAD.sm}px`,
                  padding: "8px 12px",
                  fontSize: TXT.md,
                  fontFamily: FONT.sans,
                  lineHeight: LH.relaxed,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {msg.content || (chatLoading && i === messages.length - 1 ? <span style={{ opacity: 0.5 }}>thinking…</span> : null)}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "10px 12px", borderTop: `1px solid ${CLR.borderDefault}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitChat(); } }}
                placeholder="Ask a question…"
                rows={1}
                style={{ flex: 1, resize: "none", border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.md, padding: "8px 10px", fontSize: TXT.md, fontFamily: FONT.sans, color: CLR.textPrimary, background: "#ffffff", outline: "none", lineHeight: LH.normal, maxHeight: 100, overflowY: "auto" }}
                onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 100) + "px"; }}
              />
              <button onClick={submitChat} disabled={!input.trim() || chatLoading}
                style={{ background: !input.trim() || chatLoading ? CLR.borderDefault : accentColor, color: !input.trim() || chatLoading ? CLR.textMuted : "#ffffff", border: "none", borderRadius: RAD.md, padding: "8px 14px", cursor: !input.trim() || chatLoading ? "default" : "pointer", fontSize: TXT.md, fontFamily: FONT.sans, fontWeight: 600, transition: "background 0.12s", flexShrink: 0, height: 36 }}>
                ↑
              </button>
            </div>
            <div style={{ fontSize: 10, color: CLR.textMuted, fontFamily: FONT.sans, marginTop: 5 }}>Enter to send · Shift+Enter for newline</div>
          </div>
        </>
      )}

      {/* ── REFINE MODE ── */}
      {mode === "refine" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 14px", gap: 14, overflowY: "auto" }}>

          {refinePhase === "idle" && (
            <>
              <div style={{ fontSize: TXT.sm, color: CLR.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed }}>
                Describe how to transform this department. Claude will regenerate it with your changes applied — roles, workflows, agents, and all.
              </div>
              <textarea
                value={refineInput}
                onChange={e => setRefineInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) startRefine(); }}
                placeholder="e.g. Make this a rural clinic with limited connectivity…"
                rows={4}
                style={{ resize: "vertical", border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.md, padding: "10px 12px", fontSize: TXT.md, fontFamily: FONT.sans, color: CLR.textPrimary, background: "#ffffff", outline: "none", lineHeight: LH.relaxed, minHeight: 90 }}
              />
              <button onClick={startRefine} disabled={!refineInput.trim()}
                style={{ background: refineInput.trim() ? accentColor : CLR.borderDefault, color: refineInput.trim() ? "#ffffff" : CLR.textMuted, border: "none", borderRadius: RAD.md, padding: "10px 0", cursor: refineInput.trim() ? "pointer" : "default", fontSize: TXT.md, fontFamily: FONT.sans, fontWeight: 600 }}>
                Refine Department →
              </button>
              <div style={{ fontSize: 10, color: CLR.textMuted, fontFamily: FONT.sans, marginTop: -6 }}>⌘↵ to submit</div>
              <div style={{ borderTop: `1px solid ${CLR.borderDefault}`, paddingTop: 12 }}>
                <div style={{ fontSize: 10, color: CLR.textMuted, fontFamily: FONT.sans, fontWeight: 600, letterSpacing: "0.08em", marginBottom: 8 }}>EXAMPLES</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {refineExamples.map(ex => (
                    <button key={ex} onClick={() => setRefineInput(ex)}
                      style={{ background: "#f8f9fb", border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.md, padding: "6px 10px", cursor: "pointer", textAlign: "left", fontSize: TXT.sm, color: CLR.textSecondary, fontFamily: FONT.sans, lineHeight: LH.normal }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = accentColor + "60")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = CLR.borderDefault)}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {(refinePhase === "streaming" || refinePhase === "ready") && (
            <>
              <div style={{ fontSize: TXT.sm, color: CLR.textSecondary, fontFamily: FONT.sans, lineHeight: LH.normal }}>
                <span style={{ fontWeight: 600, color: CLR.textPrimary }}>"{refineInput}"</span>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 10, fontFamily: FONT.sans }}>
                  <span style={{ color: CLR.textMuted }}>{refinePhase === "ready" ? "✓ Ready to apply" : "Regenerating…"}</span>
                  <span style={{ color: accentColor, fontFamily: FONT.mono }}>{Math.round(progressPct)}%</span>
                </div>
                <div style={{ height: 4, background: "#f0f2f5", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progressPct}%`, background: refinePhase === "ready" ? "#22c55e" : accentColor, borderRadius: 2, transition: "width 0.15s ease" }} />
                </div>
              </div>

              {/* Preview of refined dept */}
              {refinedDept && (
                <div style={{ background: "#f8f9fb", border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.lg, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{refinedDept.icon}</span>
                    <div>
                      <div style={{ fontSize: TXT.md, fontWeight: 700, color: CLR.textPrimary, fontFamily: FONT.sans }}>{refinedDept.label}</div>
                      {refinedDept.region && <div style={{ fontSize: 10, color: CLR.textMuted, fontFamily: FONT.sans }}>{refinedDept.region}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: FONT.mono, color: CLR.textMuted }}>
                    {[
                      { v: refinedDept.roles?.length, l: "roles" },
                      { v: refinedDept.workflows?.length, l: "flows" },
                      { v: refinedDept.agents?.length, l: "agents" },
                    ].map(s => <span key={s.l}><span style={{ color: accentColor, fontWeight: 600 }}>{s.v || 0}</span> {s.l}</span>)}
                  </div>
                  {refinedDept.summary && (
                    <div style={{ fontSize: 11, color: CLR.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed, marginTop: 8, borderTop: `1px solid ${CLR.borderDefault}`, paddingTop: 8 }}>
                      {refinedDept.summary.slice(0, 120)}{refinedDept.summary.length > 120 ? "…" : ""}
                    </div>
                  )}
                </div>
              )}

              {refinePhase === "ready" && refinedDept && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={applyRefinement}
                    style={{ flex: 1, background: "#22c55e", color: "#ffffff", border: "none", borderRadius: RAD.md, padding: "10px 0", cursor: "pointer", fontSize: TXT.md, fontFamily: FONT.sans, fontWeight: 600 }}>
                    ✓ Apply Changes
                  </button>
                  <button onClick={cancelRefine}
                    style={{ background: "transparent", color: CLR.textMuted, border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.md, padding: "10px 14px", cursor: "pointer", fontSize: TXT.md, fontFamily: FONT.sans }}>
                    ✕
                  </button>
                </div>
              )}

              {refinePhase === "streaming" && (
                <button onClick={cancelRefine}
                  style={{ background: "transparent", color: CLR.textMuted, border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.md, padding: "8px 0", cursor: "pointer", fontSize: TXT.sm, fontFamily: FONT.sans }}>
                  Cancel
                </button>
              )}
            </>
          )}

          {refinePhase === "error" && (
            <>
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: RAD.md, padding: "10px 14px", fontSize: TXT.sm, color: "#ef4444", fontFamily: FONT.sans, lineHeight: LH.normal }}>
                {refineError || "Refinement failed. Please try again."}
              </div>
              <button onClick={cancelRefine}
                style={{ background: "transparent", color: CLR.textSecondary, border: `1px solid ${CLR.borderDefault}`, borderRadius: RAD.md, padding: "8px 0", cursor: "pointer", fontSize: TXT.sm, fontFamily: FONT.sans }}>
                ← Try again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
