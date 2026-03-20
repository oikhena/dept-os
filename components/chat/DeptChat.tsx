"use client";

import { useEffect, useRef, useState } from "react";
import type { Department } from "../../types/department";
import { useChat } from "../../hooks/useChat";
import { buildChatSystemPrompt } from "../../lib/ai/prompts";
import { refineDepartment } from "../../lib/ai/refine";
import { TXT, SP, RAD, LH, LS, FONT, CLR, DETAIL, GRAY, MOTION, SHADOW, T } from "../../styles/tokens";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/IconButton";

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
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [refineInput, setRefineInput] = useState("");
  const [refinePhase, setRefinePhase] = useState<RefinePhase>("idle");
  const [refineProgress, setRefineProgress] = useState(0);
  const [refinedDept, setRefinedDept] = useState<Department | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);
  const refineAbortRef = useRef<AbortController | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { reset(); setRefinedDept(null); setRefinePhase("idle"); }, [dept.label]); // eslint-disable-line react-hooks/exhaustive-deps

  const submitChat = () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    setInput("");
    sendMessage(text);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const copyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
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
        dept, instruction,
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
    <div
      role="complementary"
      aria-label="Department chat"
      style={{
        width: 380, flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderLeft: `1px solid ${T.borderDefault}`,
        background: T.bgPrimary, height: "100%",
        animation: "slideInRight 0.2s ease",
        boxShadow: SHADOW.lg,
      }}
    >
      {/* Header */}
      <div style={{
        padding: "0 16px", height: 56,
        display: "flex", alignItems: "center", gap: 10,
        borderBottom: `1px solid ${T.borderDefault}`, flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: RAD.full,
          background: accentColor + "15", border: `1px solid ${accentColor}25`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>
          {dept.icon}
        </div>
        {/* Mode tabs */}
        <div style={{
          flex: 1, display: "flex", gap: 0,
          background: T.bgSurface, borderRadius: RAD.md, padding: 2,
        }}>
          {(["chat", "refine"] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{
                flex: 1, background: mode === m ? T.bgPrimary : "transparent",
                border: "none", borderRadius: RAD.sm, padding: "5px 0",
                cursor: "pointer", fontSize: TXT.sm, fontFamily: FONT.sans,
                fontWeight: mode === m ? 600 : 500,
                color: mode === m ? T.textPrimary : T.textMuted,
                transition: `all ${MOTION.fast}`,
                boxShadow: mode === m ? T.shadowSm : "none",
              }}>
              {m === "chat" ? "💬 Chat" : "✦ Refine"}
            </button>
          ))}
        </div>
        {mode === "chat" && messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}
            style={{ fontSize: TXT.xs, padding: "0 8px", height: 26 }}>
            clear
          </Button>
        )}
        <IconButton label="Close chat" onClick={onClose} size={28} variant="ghost">✕</IconButton>
      </div>

      {/* ── CHAT MODE ── */}
      {mode === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.length === 0 && (
              <div>
                <div style={{ fontSize: TXT.sm, color: T.textMuted, fontFamily: FONT.sans, marginBottom: 16, lineHeight: LH.relaxed }}>
                  Ask anything about this institution — roles, workflows, AI opportunities, cost leaks, or how to prioritize.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {starters.map(s => (
                    <button key={s} onClick={() => sendMessage(s)}
                      style={{
                        background: T.bgSecondary, border: `1px solid ${T.borderDefault}`,
                        borderRadius: RAD.lg, padding: "10px 14px",
                        cursor: "pointer", textAlign: "left",
                        fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans,
                        lineHeight: LH.normal, transition: `all ${MOTION.fast}`,
                        display: "flex", alignItems: "center", gap: 8,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = accentColor + "60";
                        e.currentTarget.style.background = accentColor + "06";
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = T.borderDefault;
                        e.currentTarget.style.background = T.bgSecondary;
                      }}>
                      <span style={{ color: accentColor, fontSize: TXT.md }}>→</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex", flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                animation: "fadeIn 0.15s ease",
              }}>
                <div style={{
                  maxWidth: "88%", position: "relative",
                  background: msg.role === "user" ? accentColor : T.bgSecondary,
                  color: msg.role === "user" ? "#ffffff" : T.textPrimary,
                  border: msg.role === "user" ? "none" : `1px solid ${T.borderDefault}`,
                  borderRadius: msg.role === "user"
                    ? `${RAD.lg}px ${RAD.lg}px ${RAD.sm}px ${RAD.lg}px`
                    : `${RAD.lg}px ${RAD.lg}px ${RAD.lg}px ${RAD.sm}px`,
                  padding: "10px 14px",
                  fontSize: TXT.md, fontFamily: FONT.sans,
                  lineHeight: LH.relaxed,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {msg.content || (chatLoading && i === messages.length - 1 ? (
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: GRAY[400], animation: "pulse 1s ease infinite" }} />
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: GRAY[400], animation: "pulse 1s ease 0.2s infinite" }} />
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: GRAY[400], animation: "pulse 1s ease 0.4s infinite" }} />
                    </span>
                  ) : null)}
                </div>
                {/* Copy button for AI messages */}
                {msg.role === "assistant" && msg.content && (
                  <button
                    onClick={() => copyMessage(msg.content, i)}
                    style={{
                      background: "transparent", border: "none",
                      color: copiedIdx === i ? CLR.success : GRAY[400],
                      cursor: "pointer", fontSize: TXT.xs, fontFamily: FONT.sans,
                      padding: "2px 4px", marginTop: 2,
                      transition: `color ${MOTION.fast}`,
                    }}>
                    {copiedIdx === i ? "✓ Copied" : "Copy"}
                  </button>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "12px 14px", borderTop: `1px solid ${T.borderDefault}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitChat(); } }}
                placeholder="Ask a question..."
                rows={1}
                aria-label="Chat message"
                style={{
                  flex: 1, resize: "none",
                  border: `1px solid ${T.borderDefault}`, borderRadius: RAD.lg,
                  padding: "10px 12px", fontSize: TXT.md, fontFamily: FONT.sans,
                  color: T.textPrimary, background: T.bgPrimary, outline: "none",
                  lineHeight: LH.normal, maxHeight: 100, overflowY: "auto",
                  transition: `border-color ${MOTION.fast}`,
                }}
                onFocus={e => e.currentTarget.style.borderColor = accentColor}
                onBlur={e => e.currentTarget.style.borderColor = T.borderDefault}
                onInput={e => { const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 100) + "px"; }}
              />
              <Button
                variant="primary"
                size="md"
                onClick={submitChat}
                disabled={!input.trim() || chatLoading}
                style={{
                  background: !input.trim() || chatLoading ? GRAY[200] : accentColor,
                  borderColor: !input.trim() || chatLoading ? GRAY[200] : accentColor,
                  height: 38, width: 38, padding: 0,
                }}>
                ↑
              </Button>
            </div>
            <div style={{ fontSize: TXT.xs, color: GRAY[400], fontFamily: FONT.sans, marginTop: 6 }}>
              Enter to send · Shift+Enter for newline
            </div>
          </div>
        </>
      )}

      {/* ── REFINE MODE ── */}
      {mode === "refine" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "16px 14px", gap: 16, overflowY: "auto" }}>

          {refinePhase === "idle" && (
            <>
              <div style={{ fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed }}>
                Describe how to transform this department. Claude will regenerate it with your changes applied — roles, workflows, agents, and all.
              </div>
              <textarea
                value={refineInput}
                onChange={e => setRefineInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) startRefine(); }}
                placeholder="e.g. Make this a rural clinic with limited connectivity..."
                rows={4}
                aria-label="Refinement instruction"
                style={{
                  resize: "vertical", border: `1px solid ${T.borderDefault}`,
                  borderRadius: RAD.lg, padding: "12px 14px",
                  fontSize: TXT.md, fontFamily: FONT.sans,
                  color: T.textPrimary, background: T.bgPrimary, outline: "none",
                  lineHeight: LH.relaxed, minHeight: 90,
                  transition: `border-color ${MOTION.fast}`,
                }}
                onFocus={e => e.currentTarget.style.borderColor = accentColor}
                onBlur={e => e.currentTarget.style.borderColor = T.borderDefault}
              />
              <Button variant="primary" size="md" onClick={startRefine} disabled={!refineInput.trim()}
                style={{
                  width: "100%",
                  background: refineInput.trim() ? accentColor : GRAY[200],
                  borderColor: refineInput.trim() ? accentColor : GRAY[200],
                }}>
                Refine Department →
              </Button>
              <div style={{ fontSize: TXT.xs, color: GRAY[400], fontFamily: FONT.sans, marginTop: -8 }}>⌘↵ to submit</div>
              <div style={{ borderTop: `1px solid ${T.borderDefault}`, paddingTop: 14 }}>
                <div style={{ fontSize: TXT.xs, color: T.textMuted, fontFamily: FONT.sans, fontWeight: 600, letterSpacing: LS.wide, marginBottom: 10 }}>EXAMPLES</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {refineExamples.map(ex => (
                    <button key={ex} onClick={() => setRefineInput(ex)}
                      style={{
                        background: T.bgSecondary, border: `1px solid ${T.borderDefault}`,
                        borderRadius: RAD.lg, padding: "8px 12px",
                        cursor: "pointer", textAlign: "left",
                        fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans,
                        lineHeight: LH.normal, transition: `all ${MOTION.fast}`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = accentColor + "60"; e.currentTarget.style.background = accentColor + "06"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderDefault; e.currentTarget.style.background = T.bgSecondary; }}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {(refinePhase === "streaming" || refinePhase === "ready") && (
            <>
              <div style={{ fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans }}>
                <span style={{ fontWeight: 600, color: T.textPrimary }}>&ldquo;{refineInput}&rdquo;</span>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: TXT.xs, fontFamily: FONT.sans }}>
                  <span style={{ color: GRAY[500] }}>{refinePhase === "ready" ? "✓ Ready to apply" : "Regenerating..."}</span>
                  <span style={{ color: accentColor, fontFamily: FONT.mono }}>{Math.round(progressPct)}%</span>
                </div>
                <div style={{ height: 4, background: T.bgSurface, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${progressPct}%`,
                    background: refinePhase === "ready" ? CLR.success : accentColor,
                    borderRadius: 2, transition: "width 0.15s ease",
                  }} />
                </div>
              </div>

              {refinedDept && (
                <div style={{
                  background: T.bgSecondary, border: `1px solid ${T.borderDefault}`,
                  borderRadius: RAD.lg, padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 22 }}>{refinedDept.icon}</span>
                    <div>
                      <div style={{ fontSize: TXT.md, fontWeight: 700, color: T.textPrimary, fontFamily: FONT.sans }}>{refinedDept.label}</div>
                      {refinedDept.region && <div style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans }}>{refinedDept.region}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: TXT.sm, fontFamily: FONT.mono, color: GRAY[500] }}>
                    {[
                      { v: refinedDept.roles?.length, l: "roles" },
                      { v: refinedDept.workflows?.length, l: "flows" },
                      { v: refinedDept.agents?.length, l: "agents" },
                    ].map(s => <span key={s.l}><span style={{ color: accentColor, fontWeight: 600 }}>{s.v || 0}</span> {s.l}</span>)}
                  </div>
                  {refinedDept.summary && (
                    <div style={{ fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans, lineHeight: LH.relaxed, marginTop: 10, borderTop: `1px solid ${T.borderDefault}`, paddingTop: 10 }}>
                      {refinedDept.summary.slice(0, 140)}{refinedDept.summary.length > 140 ? "..." : ""}
                    </div>
                  )}
                </div>
              )}

              {refinePhase === "ready" && refinedDept && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="success" size="md" onClick={applyRefinement} style={{ flex: 1, background: CLR.success, borderColor: CLR.success, color: "#fff" }}>
                    ✓ Apply Changes
                  </Button>
                  <IconButton label="Cancel" onClick={cancelRefine} size={36}>✕</IconButton>
                </div>
              )}

              {refinePhase === "streaming" && (
                <Button variant="secondary" size="sm" onClick={cancelRefine} style={{ width: "100%" }}>
                  Cancel
                </Button>
              )}
            </>
          )}

          {refinePhase === "error" && (
            <>
              <div style={{
                background: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: RAD.lg, padding: "12px 16px",
                fontSize: TXT.sm, color: CLR.danger, fontFamily: FONT.sans, lineHeight: LH.normal,
              }}>
                {refineError || "Refinement failed. Please try again."}
              </div>
              <Button variant="secondary" size="sm" onClick={cancelRefine} style={{ width: "100%" }}>
                ← Try again
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
