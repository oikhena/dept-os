"use client";

import { useState, useEffect } from "react";
import type { Agent, Department } from "../../types/department";
import { AGENT_TYPES } from "../../data/constants";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { TXT, SP, RAD, LH, FONT, CLR, T } from "../../styles/tokens";

interface AgentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (agent: Agent) => void;
  agent?: Agent;
  dept: Department;
}

const COMPLEXITY_OPTIONS = ["low", "medium", "high"] as const;
const TYPE_KEYS = ["web", "mobile", "edge", "orch"] as const;

export default function AgentFormModal({ open, onClose, onSave, agent, dept }: AgentFormModalProps) {
  const isEdit = !!agent;

  const [name, setName] = useState("");
  const [type, setType] = useState<Agent["type"]>("web");
  const [trigger, setTrigger] = useState("");
  const [output, setOutput] = useState("");
  const [humanInLoop, setHumanInLoop] = useState("");
  const [hilEnabled, setHilEnabled] = useState(false);
  const [integrations, setIntegrations] = useState("");
  const [priority, setPriority] = useState(3);
  const [complexity, setComplexity] = useState<Agent["complexity"]>("medium");
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [mobileFirst, setMobileFirst] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setType(agent.type);
      setTrigger(agent.trigger);
      setOutput(agent.output);
      setHumanInLoop(agent.humanInLoop || "");
      setHilEnabled(!!agent.humanInLoop);
      setIntegrations((agent.integrations || []).join(", "));
      setPriority(agent.priority);
      setComplexity(agent.complexity);
      setTaskIds(agent.taskIds || []);
      setMobileFirst(agent.mobileFirst || false);
    } else {
      setName("");
      setType("web");
      setTrigger("");
      setOutput("");
      setHumanInLoop("");
      setHilEnabled(false);
      setIntegrations("");
      setPriority(3);
      setComplexity("medium");
      setTaskIds([]);
      setMobileFirst(false);
    }
  }, [agent, open]);

  const handleSubmit = () => {
    if (!name.trim() || !trigger.trim() || !output.trim()) return;
    const parsed: Agent = {
      id: agent?.id || `agent_${Date.now()}`,
      name: name.trim(),
      type,
      trigger: trigger.trim(),
      output: output.trim(),
      humanInLoop: hilEnabled && humanInLoop.trim() ? humanInLoop.trim() : undefined,
      integrations: integrations.split(",").map(s => s.trim()).filter(Boolean),
      priority,
      complexity,
      taskIds,
      mobileFirst: type === "mobile" ? mobileFirst : undefined,
    };
    onSave(parsed);
    onClose();
  };

  const allTasks = [
    ...(dept.knowledgeWork || []).map(k => ({ id: k.id, label: k.label, kind: "task" as const })),
    ...(dept.sensors || []).map(s => ({ id: s.id, label: s.label, kind: "sensor" as const })),
  ];

  const toggleTask = (id: string) => {
    setTaskIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", fontSize: TXT.md,
    fontFamily: FONT.sans, background: T.bgSurface,
    border: `1px solid ${T.borderDefault}`, borderRadius: RAD.md,
    color: T.textPrimary, outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: TXT.xs, fontWeight: 600, color: T.textMuted,
    letterSpacing: "0.05em", textTransform: "uppercase",
    marginBottom: 4, display: "block",
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Agent" : "New Agent"} width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>

        {/* Name */}
        <div>
          <label style={labelStyle}>Agent Name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Intake Triage Bot" />
        </div>

        {/* Type selector */}
        <div>
          <label style={labelStyle}>Type</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: SP.sm }}>
            {TYPE_KEYS.map(k => {
              const at = AGENT_TYPES[k];
              const sel = type === k;
              return (
                <button key={k} onClick={() => setType(k)}
                  style={{
                    background: sel ? at.color + "18" : T.bgSurface,
                    border: `1px solid ${sel ? at.color : T.borderDefault}`,
                    borderRadius: RAD.md, padding: "10px 6px", cursor: "pointer",
                    textAlign: "center", transition: "all 0.15s",
                  }}>
                  <div style={{ fontSize: 18, marginBottom: 2 }}>{at.icon}</div>
                  <div style={{ fontSize: TXT.xs, fontWeight: 600, color: sel ? at.color : T.textSecondary }}>{at.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Trigger + Output */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.md }}>
          <div>
            <label style={labelStyle}>Trigger</label>
            <input style={inputStyle} value={trigger} onChange={e => setTrigger(e.target.value)} placeholder="e.g. New patient arrives" />
          </div>
          <div>
            <label style={labelStyle}>Output</label>
            <input style={inputStyle} value={output} onChange={e => setOutput(e.target.value)} placeholder="e.g. Triage report PDF" />
          </div>
        </div>

        {/* Human in loop */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: 4 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Human in Loop</label>
            <button onClick={() => setHilEnabled(!hilEnabled)}
              style={{
                width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
                background: hilEnabled ? CLR.success : T.borderDefault,
                position: "relative", transition: "background 0.15s",
              }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 2, left: hilEnabled ? 18 : 2,
                transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>
          {hilEnabled && (
            <input style={inputStyle} value={humanInLoop} onChange={e => setHumanInLoop(e.target.value)} placeholder="e.g. Nurse reviews before sending" />
          )}
        </div>

        {/* Integrations */}
        <div>
          <label style={labelStyle}>Integrations (comma-separated)</label>
          <input style={inputStyle} value={integrations} onChange={e => setIntegrations(e.target.value)} placeholder="e.g. Epic EHR, Slack, PACS" />
        </div>

        {/* Priority + Complexity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.md }}>
          <div>
            <label style={labelStyle}>Priority (1 = highest)</label>
            <div style={{ display: "flex", gap: SP.xs }}>
              {[1, 2, 3, 4, 5].map(p => (
                <button key={p} onClick={() => setPriority(p)}
                  style={{
                    width: 36, height: 36, borderRadius: RAD.md, cursor: "pointer",
                    background: priority === p ? CLR.primary + "18" : T.bgSurface,
                    border: `1px solid ${priority === p ? CLR.primary : T.borderDefault}`,
                    color: priority === p ? CLR.primary : T.textSecondary,
                    fontSize: TXT.md, fontWeight: 700, fontFamily: FONT.mono,
                  }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Complexity</label>
            <div style={{ display: "flex", gap: SP.xs }}>
              {COMPLEXITY_OPTIONS.map(c => (
                <button key={c} onClick={() => setComplexity(c)}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: RAD.md, cursor: "pointer",
                    background: complexity === c ? CLR.primary + "18" : T.bgSurface,
                    border: `1px solid ${complexity === c ? CLR.primary : T.borderDefault}`,
                    color: complexity === c ? CLR.primary : T.textSecondary,
                    fontSize: TXT.sm, fontWeight: 600, fontFamily: FONT.sans,
                    textTransform: "capitalize",
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile first toggle (only for mobile type) */}
        {type === "mobile" && (
          <div style={{ display: "flex", alignItems: "center", gap: SP.sm }}>
            <button onClick={() => setMobileFirst(!mobileFirst)}
              style={{
                width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
                background: mobileFirst ? CLR.success : T.borderDefault,
                position: "relative", transition: "background 0.15s",
              }}>
              <div style={{
                width: 16, height: 16, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 2, left: mobileFirst ? 18 : 2,
                transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }} />
            </button>
            <span style={{ fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans }}>Mobile-first design</span>
          </div>
        )}

        {/* Task assignment checklist */}
        {allTasks.length > 0 && (
          <div>
            <label style={labelStyle}>Assigned Tasks & Sensors</label>
            <div style={{
              maxHeight: 180, overflowY: "auto", border: `1px solid ${T.borderDefault}`,
              borderRadius: RAD.md, background: T.bgSurface,
            }}>
              {allTasks.map(t => {
                const checked = taskIds.includes(t.id);
                return (
                  <label key={t.id} style={{
                    display: "flex", alignItems: "center", gap: SP.sm, padding: "8px 12px",
                    cursor: "pointer", borderBottom: `1px solid ${T.borderSubtle}`,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = T.bgHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleTask(t.id)}
                      style={{ accentColor: CLR.primary }} />
                    <span style={{ fontSize: TXT.sm, color: T.textPrimary, fontFamily: FONT.sans }}>{t.label}</span>
                    <span style={{
                      fontSize: TXT.xs, color: t.kind === "sensor" ? "#a78bfa" : CLR.success,
                      marginLeft: "auto", fontFamily: FONT.mono,
                    }}>
                      {t.kind === "sensor" ? "sensor" : "task"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: SP.sm, paddingTop: SP.sm }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={handleSubmit}
            disabled={!name.trim() || !trigger.trim() || !output.trim()}>
            {isEdit ? "Save Changes" : "Create Agent"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
