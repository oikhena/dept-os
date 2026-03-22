"use client";

import { useState, useRef, Dispatch, SetStateAction } from "react";
import type { Department } from "../../types/department";
import { TXT, SP, RAD, LS, LH, FONT, CLR, GRAY, MOTION, T } from "../../styles/tokens";
import { VALUE_FLOW_COLORS, ROLE_ICONS, ACCENT_COLORS } from "../../data/constants";
import { Button } from "../ui/Button";

interface DepartmentBuilderProps {
  dept: Department;
  setDept: Dispatch<SetStateAction<Department>>;
  onDone: () => void;
}

export default function DepartmentBuilder({ dept, setDept, onDone }: DepartmentBuilderProps) {
  const [step, setStep] = useState("meta");
  const [roleForm, setRoleForm] = useState({ label: "", icon: "👤", x: 50, y: 50 });
  const [wfForm, setWfForm] = useState({ from: "", to: "", label: "", type: "knowledge", aiImpact: "high", valueFlow: "valueCreate" });
  const [taskForm, setTaskForm] = useState({ role: "", label: "", effort: 5, frequency: "Daily", aiImpact: "supercharge" as "supercharge" | "shortcircuit", aiNote: "", costPerYear: "" });
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const accentColor = dept.color || CLR.primary;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: `${SP.sm}px ${SP.md}px`,
    background: T.bgSecondary, border: `1px solid ${T.borderDefault}`, color: T.textPrimary,
    borderRadius: RAD.md, fontSize: TXT.md, fontFamily: FONT.sans, outline: "none",
    boxSizing: "border-box", transition: `border-color ${MOTION.fast}`,
  };

  const selectStyle: React.CSSProperties = { ...inputStyle };

  const inp = (val: string, fn: (v: string) => void, ph: string) =>
    <input value={val} onChange={e => fn(e.target.value)} placeholder={ph} style={inputStyle}
      onFocus={e => e.currentTarget.style.borderColor = accentColor}
      onBlur={e => e.currentTarget.style.borderColor = T.borderDefault} />;

  const sel = (val: string, fn: (v: string) => void, opts: { v: string, l: string }[]) =>
    <select value={val} onChange={e => fn(e.target.value)} style={selectStyle}>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>;

  const steps = ["meta", "roles", "workflows", "tasks", "preview"];
  const stepLabels = ["Identity", "Roles", "Workflows", "Tasks", "Preview"];
  const stepIndex = steps.indexOf(step);

  const sectionLabel = (text: string) => (
    <div style={{ fontSize: TXT.xs, color: GRAY[500], letterSpacing: LS.wide, fontWeight: 600, marginBottom: SP.md, textTransform: "uppercase" }}>
      {text}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: FONT.sans }}>
      {/* Horizontal stepper */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: `${SP.lg}px ${SP.xxl}px`, borderBottom: `1px solid ${T.borderDefault}`,
        background: T.bgSecondary, gap: 0,
      }}>
        {steps.map((s, i) => {
          const isActive = step === s;
          const isPast = stepIndex > i;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <button onClick={() => setStep(s)} style={{
                display: "flex", alignItems: "center", gap: SP.sm,
                background: "transparent", border: "none", cursor: "pointer",
                padding: `${SP.sm}px ${SP.md}px`, borderRadius: RAD.md,
                transition: `all ${MOTION.fast}`,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: TXT.xs, fontWeight: 700, fontFamily: FONT.sans,
                  background: isActive ? accentColor : isPast ? CLR.success : GRAY[200],
                  color: isActive || isPast ? "#fff" : GRAY[500],
                  transition: `all ${MOTION.fast}`,
                }}>
                  {isPast ? "✓" : i + 1}
                </div>
                <span style={{
                  fontSize: TXT.sm, fontWeight: isActive ? 600 : 400,
                  color: isActive ? accentColor : isPast ? T.textPrimary : GRAY[400],
                }}>
                  {stepLabels[i]}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div style={{
                  width: 32, height: 1,
                  background: isPast ? CLR.success : GRAY[200],
                  transition: `background ${MOTION.fast}`,
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div style={{ flex: 1, padding: `${SP.xl}px ${SP.xxl}px`, overflowY: "auto", maxWidth: 720, width: "100%", margin: "0 auto" }}>

        {step === "meta" && (
          <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
            {sectionLabel("Department identity")}
            {inp(dept.label, v => setDept(d => ({ ...d, label: v })), "Department name")}
            <textarea value={dept.summary} onChange={e => setDept(d => ({ ...d, summary: e.target.value }))} placeholder="Describe this department..."
              style={{ ...inputStyle, height: 100, resize: "vertical" }}
              onFocus={e => e.currentTarget.style.borderColor = accentColor}
              onBlur={e => e.currentTarget.style.borderColor = T.borderDefault} />
            <div>
              {sectionLabel("Icon")}
              <div style={{ display: "flex", gap: SP.xs, flexWrap: "wrap" }}>
                {["🏢", "🏥", "🏫", "🏙️", "🚨", "🛂", "🚔", "💉", "⚖️", "🚰", "🏭", "🌐", "🎓", "🏦", "🛰️", "🤖", "🏗️", "💡"].map(ic => (
                  <button key={ic} onClick={() => setDept(d => ({ ...d, icon: ic }))}
                    style={{
                      width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                      background: dept.icon === ic ? accentColor + "18" : T.bgSecondary,
                      border: `1px solid ${dept.icon === ic ? accentColor : T.borderDefault}`,
                      borderRadius: RAD.md, cursor: "pointer", fontSize: 18,
                      transition: `all ${MOTION.fast}`,
                    }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              {sectionLabel("Accent color")}
              <div style={{ display: "flex", gap: SP.sm, flexWrap: "wrap" }}>
                {ACCENT_COLORS.map(c => (
                  <button key={c} onClick={() => setDept(d => ({ ...d, color: c }))}
                    style={{
                      width: 28, height: 28, background: c, borderRadius: "50%",
                      border: dept.color === c ? "3px solid #fff" : "2px solid transparent",
                      cursor: "pointer", boxShadow: dept.color === c ? `0 0 0 2px ${c}` : "none",
                      transition: `all ${MOTION.fast}`,
                    }} />
                ))}
              </div>
            </div>
            <Button variant="primary" size="md" onClick={() => setStep("roles")}
              style={{ alignSelf: "flex-start", background: accentColor, borderColor: accentColor }}>
              Next: Roles →
            </Button>
          </div>
        )}

        {step === "roles" && (
          <div>
            {sectionLabel("Roles & positions")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.xl }}>
              <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
                {inp(roleForm.label, v => setRoleForm(f => ({ ...f, label: v })), "Role name (e.g. 'Case Manager')")}
                <div>
                  <div style={{ fontSize: TXT.xs, color: GRAY[500], marginBottom: SP.xs, fontWeight: 500 }}>Icon</div>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap", maxHeight: 120, overflowY: "auto" }}>
                    {ROLE_ICONS.map(ic => (
                      <button key={ic} onClick={() => setRoleForm(f => ({ ...f, icon: ic }))}
                        style={{
                          width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center",
                          background: roleForm.icon === ic ? accentColor + "18" : T.bgSecondary,
                          border: `1px solid ${roleForm.icon === ic ? accentColor : T.borderDefault}`,
                          borderRadius: RAD.sm, cursor: "pointer", fontSize: 14,
                        }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <Button variant="primary" size="sm"
                  style={{ background: accentColor, borderColor: accentColor }}
                  onClick={() => {
                    if (!roleForm.label.trim()) return;
                    const id = "r_" + Date.now();
                    setDept(d => ({ ...d, roles: [...d.roles, { ...roleForm, id }] }));
                    setRoleForm({ label: "", icon: "👤", x: 20 + Math.random() * 60, y: 20 + Math.random() * 55 });
                  }}>
                  + Add Role
                </Button>

                {dept.roles.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: SP.xs, marginTop: SP.sm }}>
                    {dept.roles.map(r => (
                      <div key={r.id} style={{
                        background: T.bgSecondary, border: `1px solid ${T.borderDefault}`, borderRadius: RAD.md,
                        padding: `${SP.sm}px ${SP.md}px`, display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <span style={{ fontSize: TXT.md, color: T.textSecondary }}>{r.icon} {r.label}</span>
                        <button onClick={() => setDept(d => ({ ...d, roles: d.roles.filter(x => x.id !== r.id), workflows: d.workflows.filter(w => w.from !== r.id && w.to !== r.id), knowledgeWork: d.knowledgeWork.filter(k => k.role !== r.id) }))}
                          style={{ background: "transparent", border: "none", color: GRAY[400], cursor: "pointer", fontSize: TXT.sm, padding: SP.xs }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize: TXT.xs, color: GRAY[500], marginBottom: SP.sm, fontWeight: 500 }}>Position on map (drag roles)</div>
                <svg ref={svgRef} viewBox="0 0 100 100"
                  style={{ width: "100%", height: 240, background: T.bgSecondary, border: `1px solid ${T.borderDefault}`, borderRadius: RAD.lg, cursor: "crosshair" }}
                  onMouseMove={e => {
                    if (!dragging || !svgRef.current) return;
                    const r = svgRef.current.getBoundingClientRect();
                    const x = Math.round(((e.clientX - r.left) / r.width) * 100), y = Math.round(((e.clientY - r.top) / r.height) * 100);
                    setDept(d => ({ ...d, roles: d.roles.map(ro => ro.id === dragging ? { ...ro, x: Math.max(8, Math.min(92, x)), y: Math.max(8, Math.min(92, y)) } : ro) }));
                  }}
                  onMouseUp={() => setDragging(null)} onMouseLeave={() => setDragging(null)}>
                  {[20, 40, 60, 80].map(x => [20, 40, 60, 80].map(y => <circle key={`${x}${y}`} cx={x} cy={y} r={0.5} fill={GRAY[200]} />))}
                  {dept.roles.map(r => (
                    <g key={r.id} onMouseDown={e => { e.preventDefault(); setDragging(r.id); }} style={{ cursor: "grab" }}>
                      <circle cx={r.x} cy={r.y} r={6} fill={GRAY[100]} stroke={accentColor} strokeWidth={0.5} />
                      <text x={r.x} y={r.y + 1} textAnchor="middle" fontSize="5" style={{ userSelect: "none", pointerEvents: "none" }}>{r.icon}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
            <div style={{ display: "flex", gap: SP.sm, marginTop: SP.xl }}>
              <Button variant="ghost" size="md" onClick={() => setStep("meta")}>← Back</Button>
              <Button variant="primary" size="md" onClick={() => setStep("workflows")}
                style={{ background: accentColor, borderColor: accentColor }}>
                Next: Workflows →
              </Button>
            </div>
          </div>
        )}

        {step === "workflows" && (
          <div>
            {sectionLabel("Workflows")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.xl }}>
              <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
                {sel(wfForm.from, v => setWfForm(f => ({ ...f, from: v })), [{ v: "", l: "— From role —" }, ...dept.roles.map(r => ({ v: r.id, l: r.icon + " " + r.label }))])}
                {sel(wfForm.to, v => setWfForm(f => ({ ...f, to: v })), [{ v: "", l: "— To role —" }, ...dept.roles.map(r => ({ v: r.id, l: r.icon + " " + r.label }))])}
                {inp(wfForm.label, v => setWfForm(f => ({ ...f, label: v })), "Flow label (e.g. 'Case handoff')")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm }}>
                  {sel(wfForm.type, v => setWfForm(f => ({ ...f, type: v })), [{ v: "knowledge", l: "Knowledge" }, { v: "physical", l: "Physical" }])}
                  {sel(wfForm.aiImpact, v => setWfForm(f => ({ ...f, aiImpact: v })), [{ v: "high", l: "High AI" }, { v: "medium", l: "Med AI" }, { v: "low", l: "Low AI" }])}
                </div>
                {sel(wfForm.valueFlow, v => setWfForm(f => ({ ...f, valueFlow: v })), [{ v: "valueCreate", l: "✅ Value creation" }, { v: "costSink", l: "🔴 Cost sink" }, { v: "valueLeak", l: "⚠️ Value leak" }, { v: "riskNode", l: "🔷 Risk node" }])}
                <Button variant="primary" size="sm"
                  style={{ background: accentColor, borderColor: accentColor }}
                  onClick={() => {
                    if (!wfForm.from || !wfForm.to || !wfForm.label.trim()) return;
                    const id = "wf_" + Date.now();
                    setDept(d => ({ ...d, workflows: [...d.workflows, { ...wfForm, id } as any] }));
                    setWfForm(f => ({ ...f, label: "", from: "", to: "" }));
                  }}>
                  + Add Workflow
                </Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: SP.xs }}>
                {dept.workflows.map(wf => {
                  const f = dept.roles.find(r => r.id === wf.from), t = dept.roles.find(r => r.id === wf.to);
                  const c = VALUE_FLOW_COLORS[wf.valueFlow];
                  return (
                    <div key={wf.id} style={{
                      background: T.bgSecondary, border: `1px solid ${c}30`, borderLeft: `3px solid ${c}`,
                      borderRadius: RAD.md, padding: `${SP.sm}px ${SP.md}px`,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: TXT.md, color: T.textSecondary }}>{wf.label}</div>
                        <div style={{ fontSize: TXT.xs, color: GRAY[400] }}>{f?.icon} → {t?.icon}</div>
                      </div>
                      <button onClick={() => setDept(d => ({ ...d, workflows: d.workflows.filter(w => w.id !== wf.id) }))}
                        style={{ background: "transparent", border: "none", color: GRAY[400], cursor: "pointer", fontSize: TXT.sm, padding: SP.xs }}>
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: SP.sm, marginTop: SP.xl }}>
              <Button variant="ghost" size="md" onClick={() => setStep("roles")}>← Back</Button>
              <Button variant="primary" size="md" onClick={() => setStep("tasks")}
                style={{ background: accentColor, borderColor: accentColor }}>
                Next: Tasks →
              </Button>
            </div>
          </div>
        )}

        {step === "tasks" && (
          <div>
            {sectionLabel("Knowledge tasks")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.xl }}>
              <div style={{ display: "flex", flexDirection: "column", gap: SP.sm }}>
                {sel(taskForm.role, v => setTaskForm(f => ({ ...f, role: v })), [{ v: "", l: "— Assign to role —" }, ...dept.roles.map(r => ({ v: r.id, l: r.icon + " " + r.label }))])}
                {inp(taskForm.label, v => setTaskForm(f => ({ ...f, label: v })), "Task name")}
                <div>
                  <div style={{ fontSize: TXT.xs, color: GRAY[500], marginBottom: SP.xs, fontWeight: 500 }}>
                    Effort (1–10): <strong style={{ color: accentColor }}>{taskForm.effort}</strong>
                  </div>
                  <input type="range" min={1} max={10} value={taskForm.effort} onChange={e => setTaskForm(f => ({ ...f, effort: +e.target.value }))}
                    style={{ width: "100%", accentColor }} />
                </div>
                {inp(taskForm.frequency, v => setTaskForm(f => ({ ...f, frequency: v })), "Frequency (e.g. 'Per case', 'Daily')")}
                {sel(taskForm.aiImpact, v => setTaskForm(f => ({ ...f, aiImpact: v as "supercharge" | "shortcircuit" })), [{ v: "supercharge", l: "⚡ Supercharge — AI amplifies" }, { v: "shortcircuit", l: "🔁 Shortcircuit — AI replaces" }])}
                {inp(taskForm.aiNote, v => setTaskForm(f => ({ ...f, aiNote: v })), "AI opportunity note")}
                {inp(taskForm.costPerYear, v => setTaskForm(f => ({ ...f, costPerYear: v })), "Annual cost estimate")}
                <Button variant="primary" size="sm"
                  style={{ background: accentColor, borderColor: accentColor }}
                  onClick={() => {
                    if (!taskForm.role || !taskForm.label.trim()) return;
                    const id = "k_" + Date.now();
                    setDept(d => ({ ...d, knowledgeWork: [...d.knowledgeWork, { ...taskForm, id } as any] }));
                    setTaskForm(f => ({ ...f, label: "", aiNote: "", costPerYear: "" }));
                  }}>
                  + Add Task
                </Button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: SP.xs }}>
                {dept.knowledgeWork.map(k => {
                  const r = dept.roles.find(x => x.id === k.role);
                  return (
                    <div key={k.id} style={{
                      background: T.bgSecondary,
                      border: `1px solid ${k.aiImpact === "supercharge" ? CLR.success + "30" : CLR.warning + "30"}`,
                      borderLeft: `3px solid ${k.aiImpact === "supercharge" ? CLR.success : CLR.warning}`,
                      borderRadius: RAD.md, padding: `${SP.sm}px ${SP.md}px`,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: TXT.md, color: T.textSecondary }}>{k.label}</div>
                        <div style={{ fontSize: TXT.xs, color: GRAY[400] }}>
                          {r?.icon} {r?.label} · {k.frequency}
                          <span style={{ marginLeft: SP.sm, color: k.aiImpact === "supercharge" ? CLR.success : CLR.warning }}>
                            {k.aiImpact === "supercharge" ? "⚡" : "🔁"}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => setDept(d => ({ ...d, knowledgeWork: d.knowledgeWork.filter(x => x.id !== k.id) }))}
                        style={{ background: "transparent", border: "none", color: GRAY[400], cursor: "pointer", fontSize: TXT.sm, padding: SP.xs }}>
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: SP.sm, marginTop: SP.xl }}>
              <Button variant="ghost" size="md" onClick={() => setStep("workflows")}>← Back</Button>
              <Button variant="primary" size="md" onClick={() => setStep("preview")}
                style={{ background: accentColor, borderColor: accentColor }}>
                Next: Preview →
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div>
            {sectionLabel(`Preview — ${dept.icon} ${dept.label || "Untitled"}`)}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: SP.md, marginBottom: SP.xl }}>
              {[
                { l: "Roles", v: dept.roles.length, c: accentColor },
                { l: "Workflows", v: dept.workflows.length, c: CLR.purple },
                { l: "Tasks", v: dept.knowledgeWork.length, c: CLR.success },
                { l: "⚡ Supercharge", v: dept.knowledgeWork.filter(k => k.aiImpact === "supercharge").length, c: CLR.warning },
              ].map(s => (
                <div key={s.l} style={{
                  background: T.bgSecondary, border: `1px solid ${s.c}20`,
                  borderRadius: RAD.lg, padding: SP.lg, textAlign: "center",
                }}>
                  <div style={{ fontSize: TXT.xl, fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: TXT.xs, color: GRAY[500], marginTop: SP.xs }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{
              background: T.bgSecondary, border: `1px solid ${accentColor}20`,
              borderRadius: RAD.lg, padding: SP.xl, marginBottom: SP.xl,
              fontSize: TXT.md, color: GRAY[500], lineHeight: LH.relaxed,
            }}>
              {dept.summary || "No description."}
            </div>
            <div style={{ display: "flex", gap: SP.sm }}>
              <Button variant="ghost" size="md" onClick={() => setStep("tasks")}>← Back</Button>
              <Button variant="primary" size="lg" onClick={onDone}
                style={{ background: accentColor, borderColor: accentColor, fontWeight: 700 }}>
                Launch {dept.icon} {dept.label || "Department"} →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
