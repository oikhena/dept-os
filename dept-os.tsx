"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Department, Advisor } from "./types/department";
import type { SavedDepartment } from "./types/saved";
import type { User } from "@supabase/supabase-js";
import { TXT, SP, RAD, LS, LH, FONT, SIDEBAR, MAP, DETAIL, CLR } from "./styles/tokens";
import { VALUE_FLOW_COLORS, VALUE_FLOW_LABELS, SENSE_COLORS, SENSE_ICONS, AGENT_TYPES } from "./data/constants";
import { DEPARTMENTS, EMPTY_CUSTOM } from "./data/templates";
import { computeAdvisors } from "./hooks/useAdvisors";
import { createClient } from "./lib/supabase/client";
import { loadUserDepartments, saveDepartment, updateDepartment, deleteDepartment } from "./lib/supabase/departments";
import Sidebar from "./components/sidebar/Sidebar";
import OperationalMap from "./components/canvas/OperationalMap";
import AgentsTab from "./components/canvas/AgentsTab";
import DepartmentBuilder from "./components/builder/DepartmentBuilder";
import GeneratePanel from "./components/builder/GeneratePanel";

export default function DeptOS() {
  const [selectedDept, setSelectedDept] = useState("hospital");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedSense, setSelectedSense] = useState<string | null>(null);
  const [selectedValueFlow, setSelectedValueFlow] = useState<string | null>(null);
  const [hoveredWorkflow, setHoveredWorkflow] = useState<string | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [showGenPanel, setShowGenPanel] = useState(false);
  const animRef = useRef<number>(0);

  // Auth + persistence state
  const [user, setUser] = useState<User | null>(null);
  const [savedDepts, setSavedDepts] = useState<SavedDepartment[]>([]);
  const [editingDept, setEditingDept] = useState<Department>({ ...EMPTY_CUSTOM });

  // Check auth and load saved departments
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        loadUserDepartments(supabase).then(setSavedDepts).catch(console.error);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserDepartments(supabase).then(setSavedDepts).catch(console.error);
      } else {
        setSavedDepts([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let f = 0;
    const tick = () => { f=(f+1)%360; setPulsePhase(f); animRef.current=requestAnimationFrame(tick); };
    animRef.current = requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(animRef.current!);
  }, []);

  useEffect(() => {
    setSelectedNode(null); setSelectedSense(null); setSelectedValueFlow(null); setBuilderOpen(false);
  }, [selectedDept]);

  const isBuiltIn = selectedDept in DEPARTMENTS;
  const isSaved = !isBuiltIn && selectedDept !== "__editing__";
  const isEditing = selectedDept === "__editing__";

  const dept = isBuiltIn
    ? DEPARTMENTS[selectedDept]
    : isEditing
    ? editingDept
    : savedDepts.find(s => s.id === selectedDept)?.department;

  if (!dept) return null;

  const accentColor = dept.color || "#00b4d8";

  const getRoleById = (id: string) => dept.roles?.find(r=>r.id===id);

  const selectedRole = selectedNode ? dept.roles?.find(r=>r.id===selectedNode) : null;
  const roleSensors = selectedNode ? (dept.sensors||[]).filter(s=>s.role===selectedNode) : [];
  const roleKnowledge = selectedNode ? (dept.knowledgeWork||[]).filter(k=>k.role===selectedNode) : [];
  const roleWorkflows = selectedNode ? (dept.workflows||[]).filter(w=>w.from===selectedNode||w.to===selectedNode) : [];
  const filteredSensors = selectedSense ? (dept.sensors||[]).filter(s=>s.sense===selectedSense) : (dept.sensors||[]);
  const filteredWorkflows = selectedValueFlow ? (dept.workflows||[]).filter(w=>w.valueFlow===selectedValueFlow) : (dept.workflows||[]);

  const handleGenerated = async (d: Department, query: string) => {
    setShowGenPanel(false);
    setActiveTab("overview");
    if (user) {
      try {
        const supabase = createClient();
        const id = await saveDepartment(supabase, d, "generated", query);
        setSavedDepts(prev => [{ id, kind: "generated", generationQuery: query, department: d, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...prev]);
        setSelectedDept(id);
      } catch (e) {
        console.error("Failed to save department:", e);
        // Fallback: show as editing dept (ephemeral)
        setEditingDept(d);
        setSelectedDept("__editing__");
      }
    } else {
      setEditingDept(d);
      setSelectedDept("__editing__");
    }
  };

  const handleBuilderDone = async () => {
    setBuilderOpen(false);
    setActiveTab("overview");
    if (user) {
      try {
        const supabase = createClient();
        const id = await saveDepartment(supabase, editingDept, "custom");
        setSavedDepts(prev => [{ id, kind: "custom", department: editingDept, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...prev]);
        setSelectedDept(id);
      } catch (e) {
        console.error("Failed to save department:", e);
      }
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!user) return;
    try {
      const supabase = createClient();
      await deleteDepartment(supabase, id);
      setSavedDepts(prev => prev.filter(d => d.id !== id));
      if (selectedDept === id) setSelectedDept("hospital");
    } catch (e) {
      console.error("Failed to delete department:", e);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setSavedDepts([]);
    setSelectedDept("hospital");
  };

  const advisors = useMemo(() => dept ? computeAdvisors(dept) : [], [dept]);

  const tabs = ["overview","sensors","knowledge","value-flows","ai-impact","agents"];
  const tabLabel = (t: string) => t === "agents" ? `Agents${(dept.agents?.length) ? ` (${dept.agents.length})` : ""}` : t.replace("-"," ");

  // Resizable split
  const [splitPct, setSplitPct] = useState(55);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientY - rect.top) / rect.height) * 100;
      setSplitPct(Math.max(25, Math.min(80, pct)));
    };
    const onUp = () => { draggingRef.current = false; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  const handleAdvisorClick = useCallback((advisor: Advisor) => {
    setActiveTab(advisor.tab);
    if (advisor.filter) setSelectedValueFlow(advisor.filter);
  }, []);

  return (
    <div style={{ fontFamily:FONT.sans, background:SIDEBAR.bg, color:CLR.textPrimary, height:"100vh", display:"flex", overflow:"hidden" }}>

      {/* ── SIDEBAR (Slack) ── */}
      <Sidebar
        departments={DEPARTMENTS} savedDepts={savedDepts}
        selectedDept={selectedDept} onSelect={setSelectedDept}
        onGenerate={() => setShowGenPanel(!showGenPanel)}
        onBuildCustom={() => { setEditingDept({ ...EMPTY_CUSTOM }); setSelectedDept("__editing__"); setBuilderOpen(true); }}
        onDelete={handleDeleteDept}
        advisors={advisors} activeTab={activeTab} onAdvisorClick={handleAdvisorClick}
        user={user} onLogout={handleLogout}
      />

      {/* ── MAIN AREA ── */}
      <div ref={containerRef} style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, background:DETAIL.bg }}>

        {/* ── CONTEXTUAL HEADER ── */}
        <div style={{ background:DETAIL.bg, borderBottom:`1px solid ${CLR.borderDefault}`, padding:"0 20px", display:"flex", alignItems:"center", height:52, flexShrink:0 }}>
          <span style={{ fontSize:20, marginRight:10 }}>{dept.icon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontFamily:FONT.sans, fontSize:15, fontWeight:700, color:CLR.textPrimary }}>{dept.label}</span>
              {dept.region && <span style={{ fontSize:11, color:CLR.textMuted, fontFamily:FONT.sans }}>{dept.region}</span>}
              {dept.infrastructure && <span style={{ fontSize:10, color:dept.infrastructure==="mobile-first"?"#34d399":dept.infrastructure==="limited-connectivity"?"#f59e0b":"#60a5fa", background:"#f8f9fb", padding:"1px 6px", borderRadius:RAD.sm, fontFamily:FONT.sans }}>📶 {dept.infrastructure}</span>}
              {isSaved && savedDepts.find(s => s.id === selectedDept)?.kind === "generated" && <span style={{ fontSize:10, color:"#22c55e", background:"#22c55e10", border:"1px solid #22c55e25", padding:"1px 7px", borderRadius:RAD.sm, fontFamily:FONT.sans }}>✦ AI-generated</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
            {[{v:dept.roles?.length,l:"roles",c:accentColor},{v:dept.workflows?.length,l:"flows",c:"#60a5fa"},{v:dept.sensors?.length,l:"sensors",c:"#a78bfa"},{v:dept.knowledgeWork?.length,l:"tasks",c:"#22c55e"},{v:dept.agents?.length,l:"agents",c:"#f59e0b"}].map(s=>(
              <div key={s.l} style={{ textAlign:"center", padding:"3px 8px" }}>
                <div style={{ fontSize:14, fontWeight:700, color:s.c, fontFamily:FONT.mono }}>{s.v||0}</div>
                <div style={{ fontSize:9, color:CLR.textMuted, fontFamily:FONT.sans, letterSpacing:LS.wide }}>{s.l.toUpperCase()}</div>
              </div>
            ))}
          </div>
          {isEditing && editingDept.roles.length > 0 && (
            <button onClick={() => setBuilderOpen(!builderOpen)} style={{ marginLeft:12, background:"transparent", border:`1px solid ${CLR.borderDefault}`, color:CLR.textSecondary, padding:"4px 10px", borderRadius:RAD.sm, cursor:"pointer", fontSize:11, fontFamily:FONT.sans }}>
              {builderOpen ? "← View" : "✏ Edit"}
            </button>
          )}
        </div>

        {/* ── GENERATE PANEL ── */}
        {showGenPanel && (
          <div style={{ background:"#f8f9fb", borderBottom:`1px solid ${CLR.borderDefault}`, height:320, flexShrink:0 }}>
            <GeneratePanel onGenerated={handleGenerated} />
          </div>
        )}

        {/* ── OPERATIONAL MAP (SimCity) ── */}
        {!showGenPanel && (
          <div style={{ height:`${splitPct}%`, flexShrink:0, position:"relative" }}>
            {isEditing && builderOpen ? (
              <div style={{ height:"100%", background:DETAIL.bg }}>
                <DepartmentBuilder dept={editingDept} setDept={setEditingDept} onDone={handleBuilderDone} />
              </div>
            ) : activeTab === "agents" ? (
              <div style={{ height:"100%", background:DETAIL.bg, overflowY:"auto" }}>
                <AgentsTab dept={dept} accentColor={accentColor} pulsePhase={pulsePhase} />
              </div>
            ) : (
              <OperationalMap
                dept={dept} activeTab={activeTab} selectedNode={selectedNode} setSelectedNode={setSelectedNode}
                selectedValueFlow={selectedValueFlow} hoveredWorkflow={hoveredWorkflow} setHoveredWorkflow={setHoveredWorkflow}
                pulsePhase={pulsePhase} accentColor={accentColor}
              />
            )}
          </div>
        )}

        {/* ── TAB BAR (between map and detail) ── */}
        {!showGenPanel && !(isEditing && builderOpen) && (
          <div style={{ display:"flex", alignItems:"center", background:DETAIL.headerBg, borderTop:`1px solid ${CLR.borderDefault}`, borderBottom:`1px solid ${CLR.borderDefault}`, padding:"0 16px", flexShrink:0 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{ background:"transparent", border:"none", borderBottom:activeTab===t ? `2px solid ${accentColor}` : "2px solid transparent", color:activeTab===t ? accentColor : CLR.textMuted, padding:"8px 14px", cursor:"pointer", fontSize:11, fontFamily:FONT.sans, fontWeight:activeTab===t ? 600 : 500, letterSpacing:LS.normal, textTransform:"uppercase", transition:"color 0.15s" }}>
                {tabLabel(t)}
              </button>
            ))}
            {/* Drag handle */}
            <div style={{ marginLeft:"auto", cursor:"row-resize", padding:"6px 8px", color:CLR.textMuted, fontSize:10, userSelect:"none", letterSpacing:"0.15em" }}
              onMouseDown={handleDragStart} title="Drag to resize">
              ⋮⋮
            </div>
          </div>
        )}

        {/* ── DETAIL PANEL (Stripe) ── */}
        {!showGenPanel && !(isEditing && builderOpen) && (
          <div style={{ flex:1, overflowY:"auto", padding:20, background:DETAIL.bg, minHeight:0 }}>

            {/* OVERVIEW */}
            {activeTab === "overview" && (
              <div>
                {/* Summary + value chain */}
                <div style={{ marginBottom:SP.lg }}>
                  <div style={{ fontSize:13, color:CLR.textSecondary, lineHeight:LH.relaxed, fontFamily:FONT.sans, marginBottom:SP.md }}>{dept.summary}</div>
                  {dept.valueChain?.[0] && (
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
                      {dept.valueChain[0].split("→").map((step, i, arr) => (
                        <span key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <span style={{ background:accentColor+"12", border:`1px solid ${accentColor}30`, color:accentColor, padding:"2px 8px", borderRadius:RAD.xl, fontSize:10, fontFamily:FONT.sans, fontWeight:500, whiteSpace:"nowrap" }}>{step.trim()}</span>
                          {i < arr.length - 1 && <span style={{ color:CLR.textMuted, fontSize:10 }}>→</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Role inspector (if selected) */}
                {selectedRole && (
                  <div style={{ background:"#f8f9fb", border:`1px solid ${accentColor}20`, borderRadius:RAD.lg, padding:SP.lg, marginBottom:SP.lg }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:SP.md }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:24 }}>{selectedRole.icon}</span>
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:CLR.textPrimary, fontFamily:FONT.sans }}>{selectedRole.label}</div>
                          <div style={{ fontSize:11, color:CLR.textMuted, fontFamily:FONT.sans }}>{roleWorkflows.length} flows · {roleSensors.length} sensors · {roleKnowledge.length} tasks</div>
                        </div>
                      </div>
                      <button onClick={() => setSelectedNode(null)} style={{ background:"transparent", border:"none", color:CLR.textMuted, cursor:"pointer", fontSize:14 }}>✕</button>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:SP.sm }}>
                      {roleWorkflows.length > 0 && (
                        <div>
                          <div style={{ fontSize:10, color:accentColor, letterSpacing:LS.wide, marginBottom:SP.xs, fontFamily:FONT.sans, fontWeight:600 }}>WORKFLOWS</div>
                          {roleWorkflows.map(wf => { const isFrom = wf.from === selectedNode; const other = getRoleById(isFrom ? wf.to : wf.from); const vfc = VALUE_FLOW_COLORS[wf.valueFlow]; return (
                            <div key={wf.id} style={{ borderLeft:`2px solid ${vfc}`, paddingLeft:8, marginBottom:6 }}>
                              <div style={{ fontSize:12, color:CLR.textPrimary, fontFamily:FONT.sans }}>{wf.label}</div>
                              <div style={{ fontSize:10, color:CLR.textMuted, fontFamily:FONT.sans }}>{isFrom ? "→" : "←"} {other?.label}</div>
                            </div>
                          ); })}
                        </div>
                      )}
                      {roleSensors.length > 0 && (
                        <div>
                          <div style={{ fontSize:10, color:"#a78bfa", letterSpacing:LS.wide, marginBottom:SP.xs, fontFamily:FONT.sans, fontWeight:600 }}>SENSORS</div>
                          {roleSensors.map(s => (
                            <div key={s.id} style={{ borderLeft:`2px solid ${SENSE_COLORS[s.sense]}`, paddingLeft:8, marginBottom:6 }}>
                              <div style={{ fontSize:12, color:CLR.textPrimary, fontFamily:FONT.sans }}>{s.label}</div>
                              <div style={{ fontSize:10, color:CLR.textMuted, fontFamily:FONT.sans }}>{s.sense}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {roleKnowledge.length > 0 && (
                        <div>
                          <div style={{ fontSize:10, color:"#22c55e", letterSpacing:LS.wide, marginBottom:SP.xs, fontFamily:FONT.sans, fontWeight:600 }}>TASKS</div>
                          {roleKnowledge.map(k => (
                            <div key={k.id} style={{ borderLeft:`2px solid ${k.aiImpact === "supercharge" ? "#22c55e" : "#f59e0b"}`, paddingLeft:8, marginBottom:6 }}>
                              <div style={{ fontSize:12, color:CLR.textPrimary, fontFamily:FONT.sans }}>{k.label}</div>
                              <div style={{ fontSize:10, color:k.aiImpact === "supercharge" ? "#22c55e" : "#f59e0b", fontFamily:FONT.sans }}>{k.aiImpact === "supercharge" ? "⚡ supercharge" : "🔁 shortcircuit"}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SENSORS — horizontal strips */}
            {activeTab === "sensors" && (
              <div>
                <div style={{ display:"flex", gap:6, marginBottom:SP.lg, flexWrap:"wrap" }}>
                  {(["sight","sound","smell","touch"] as const).map(sense => (
                    <button key={sense} onClick={() => setSelectedSense(selectedSense === sense ? null : sense)}
                      style={{ background:selectedSense === sense ? SENSE_COLORS[sense] + "18" : "transparent", border:`1px solid ${selectedSense === sense ? SENSE_COLORS[sense] : CLR.borderDefault}`, color:selectedSense === sense ? SENSE_COLORS[sense] : CLR.textMuted, padding:"4px 12px", borderRadius:RAD.md, cursor:"pointer", fontSize:11, fontFamily:FONT.sans, fontWeight:500, transition:"all 0.12s" }}>
                      {SENSE_ICONS[sense]} {sense}
                    </button>
                  ))}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {filteredSensors.map(sensor => {
                    const sc = SENSE_COLORS[sensor.sense] || "#94a3b8";
                    return (
                      <div key={sensor.id} style={{ display:"flex", gap:0, border:`1px solid ${CLR.borderDefault}`, borderRadius:RAD.md, overflow:"hidden" }}>
                        <div style={{ width:48, background:sc + "12", borderRight:`3px solid ${sc}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"8px 0", flexShrink:0 }}>
                          <span style={{ fontSize:16 }}>{sensor.icon || SENSE_ICONS[sensor.sense]}</span>
                          <span style={{ fontSize:9, color:sc, fontFamily:FONT.sans, fontWeight:600, letterSpacing:LS.wide, marginTop:3 }}>{sensor.sense?.toUpperCase()}</span>
                        </div>
                        <div style={{ flex:1, padding:"8px 14px", minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:CLR.textPrimary, fontFamily:FONT.sans, marginBottom:2 }}>{sensor.label}</div>
                          <div style={{ fontSize:11, color:CLR.textSecondary, fontFamily:FONT.sans, marginBottom:2 }}>{sensor.detail}</div>
                          <span style={{ fontSize:10, color:CLR.textMuted, fontFamily:FONT.sans }}>{getRoleById(sensor.role)?.icon} {getRoleById(sensor.role)?.label}</span>
                        </div>
                        <div style={{ width:260, background:"#22c55e06", borderLeft:`1px solid ${CLR.borderDefault}`, padding:"8px 12px", flexShrink:0, display:"flex", alignItems:"center" }}>
                          <div style={{ fontSize:11, color:"#22c55e", lineHeight:LH.normal, fontFamily:FONT.sans }}>🤖 {sensor.aiNote}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* KNOWLEDGE — Stripe data table */}
            {activeTab === "knowledge" && (
              <div>
                <div style={{ display:"flex", gap:12, marginBottom:SP.lg }}>
                  {[
                    { label:"TOTAL TASKS", value:(dept.knowledgeWork||[]).length, color:accentColor },
                    { label:"SUPERCHARGE", value:(dept.knowledgeWork||[]).filter(k=>k.aiImpact==="supercharge").length, color:"#22c55e" },
                    { label:"SHORTCIRCUIT", value:(dept.knowledgeWork||[]).filter(k=>k.aiImpact==="shortcircuit").length, color:"#f59e0b" },
                  ].map(s => (
                    <div key={s.label} style={{ padding:"8px 16px", borderRadius:RAD.md, border:`1px solid ${s.color}20` }}>
                      <div style={{ fontSize:20, fontWeight:700, color:s.color, fontFamily:FONT.mono }}>{s.value}</div>
                      <div style={{ fontSize:9, color:CLR.textMuted, fontFamily:FONT.sans, fontWeight:600, letterSpacing:LS.wide }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ border:`1px solid ${CLR.borderDefault}`, borderRadius:RAD.md, overflow:"hidden" }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 120px 80px 80px 90px 100px", gap:0, background:DETAIL.headerBg, borderBottom:`1px solid ${CLR.borderDefault}`, padding:"6px 14px" }}>
                    {["TASK","ROLE","EFFORT","FREQ","AI IMPACT","COST/YR"].map(h => (
                      <div key={h} style={{ fontSize:9, fontFamily:FONT.sans, fontWeight:600, color:CLR.textMuted, letterSpacing:LS.wide }}>{h}</div>
                    ))}
                  </div>
                  {(dept.knowledgeWork||[]).map((kw, i) => (
                    <div key={kw.id} style={{ display:"grid", gridTemplateColumns:"1fr 120px 80px 80px 90px 100px", gap:0, padding:"8px 14px", borderBottom:i < (dept.knowledgeWork||[]).length - 1 ? `1px solid ${CLR.borderDefault}` : "none", background:i % 2 === 0 ? "#ffffff" : "#fafbfc" }}>
                      <div>
                        <div style={{ fontSize:12, fontWeight:500, color:CLR.textPrimary, fontFamily:FONT.sans }}>{kw.label}</div>
                        {kw.valueAtStake && <div style={{ fontSize:10, color:CLR.textMuted, fontFamily:FONT.sans, marginTop:1 }}>{kw.valueAtStake}</div>}
                      </div>
                      <div style={{ fontSize:11, color:CLR.textSecondary, fontFamily:FONT.sans, display:"flex", alignItems:"center", gap:4 }}>{getRoleById(kw.role)?.icon} {getRoleById(kw.role)?.label}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:1 }}>
                        {Array.from({ length:10 }).map((_, j) => <div key={j} style={{ width:3, height:10, borderRadius:1, background:j < kw.effort ? accentColor : "#e5e7eb" }} />)}
                        <span style={{ fontSize:10, color:CLR.textMuted, fontFamily:FONT.mono, marginLeft:4 }}>{kw.effort}</span>
                      </div>
                      <div style={{ fontSize:11, color:CLR.textSecondary, fontFamily:FONT.sans, display:"flex", alignItems:"center" }}>{kw.frequency}</div>
                      <div style={{ display:"flex", alignItems:"center" }}>
                        <span style={{ fontSize:10, fontFamily:FONT.sans, fontWeight:600, color:kw.aiImpact === "supercharge" ? "#22c55e" : "#f59e0b", background:kw.aiImpact === "supercharge" ? "#22c55e10" : "#f59e0b10", border:`1px solid ${kw.aiImpact === "supercharge" ? "#22c55e25" : "#f59e0b25"}`, borderRadius:RAD.sm, padding:"1px 6px" }}>
                          {kw.aiImpact === "supercharge" ? "⚡ SUPER" : "🔁 SHORT"}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:"#ef4444", fontFamily:FONT.mono, display:"flex", alignItems:"center" }}>{kw.costPerYear || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VALUE FLOWS */}
            {activeTab === "value-flows" && (
              <div>
                <div style={{ display:"flex", gap:6, marginBottom:SP.lg, flexWrap:"wrap" }}>
                  {Object.entries(VALUE_FLOW_LABELS).map(([k, v]) => (
                    <button key={k} onClick={() => setSelectedValueFlow(selectedValueFlow === k ? null : k)}
                      style={{ background:selectedValueFlow === k ? VALUE_FLOW_COLORS[k] + "18" : "transparent", border:`1px solid ${selectedValueFlow === k ? VALUE_FLOW_COLORS[k] : CLR.borderDefault}`, color:selectedValueFlow === k ? VALUE_FLOW_COLORS[k] : CLR.textMuted, padding:"4px 12px", borderRadius:RAD.md, cursor:"pointer", fontSize:11, fontFamily:FONT.sans, fontWeight:500, transition:"all 0.12s" }}>
                      {v}
                    </button>
                  ))}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {filteredWorkflows.map(wf => { const from = getRoleById(wf.from), to = getRoleById(wf.to), vfc = VALUE_FLOW_COLORS[wf.valueFlow]; return (
                    <div key={wf.id} style={{ display:"flex", gap:0, border:`1px solid ${CLR.borderDefault}`, borderRadius:RAD.md, overflow:"hidden" }}>
                      <div style={{ width:6, background:vfc, flexShrink:0 }} />
                      <div style={{ flex:1, padding:"8px 14px", display:"flex", alignItems:"center", gap:16 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:CLR.textPrimary, fontFamily:FONT.sans }}>{wf.label}</div>
                          <div style={{ fontSize:11, color:CLR.textSecondary, fontFamily:FONT.sans, marginTop:2 }}>{from?.icon} {from?.label} <span style={{ color:vfc }}>→</span> {to?.icon} {to?.label}</div>
                        </div>
                        <span style={{ fontSize:10, fontFamily:FONT.sans, fontWeight:600, color:vfc, background:vfc + "12", border:`1px solid ${vfc}25`, borderRadius:RAD.sm, padding:"2px 8px", whiteSpace:"nowrap" }}>{VALUE_FLOW_LABELS[wf.valueFlow]}</span>
                        <span style={{ fontSize:10, color:CLR.textMuted, fontFamily:FONT.mono }}>{wf.type}</span>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          <div style={{ width:6, height:6, borderRadius:"50%", background:wf.aiImpact === "high" ? "#22c55e" : "#f59e0b" }} />
                          <span style={{ fontSize:10, color:CLR.textMuted, fontFamily:FONT.sans }}>{wf.aiImpact}</span>
                        </div>
                      </div>
                    </div>
                  ); })}
                </div>
              </div>
            )}

            {/* AI IMPACT */}
            {activeTab === "ai-impact" && (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:SP.lg }}>
                  {[
                    { label:"KNOWLEDGE TASKS", value:(dept.knowledgeWork||[]).length, color:accentColor },
                    { label:"SENSOR POINTS", value:(dept.sensors||[]).length, color:"#a78bfa" },
                    { label:"SUPERCHARGE", value:(dept.knowledgeWork||[]).filter(k=>k.aiImpact==="supercharge").length, color:"#22c55e" },
                    { label:"SHORTCIRCUIT", value:(dept.knowledgeWork||[]).filter(k=>k.aiImpact==="shortcircuit").length, color:"#f59e0b" },
                  ].map(stat => (
                    <div key={stat.label} style={{ background:"#f8f9fb", border:`1px solid ${stat.color}20`, borderRadius:RAD.md, padding:"10px 14px", textAlign:"center" }}>
                      <div style={{ fontSize:22, fontWeight:700, color:stat.color, fontFamily:FONT.mono }}>{stat.value}</div>
                      <div style={{ fontSize:9, color:CLR.textMuted, fontFamily:FONT.sans, fontWeight:600, letterSpacing:LS.wide }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  <div style={{ background:"#22c55e06", border:"1px solid #22c55e20", borderRadius:RAD.lg, padding:SP.lg }}>
                    <div style={{ color:"#22c55e", fontWeight:700, fontSize:12, letterSpacing:LS.wide, marginBottom:SP.sm, fontFamily:FONT.sans }}>⚡ SUPERCHARGE — AI amplifies the human</div>
                    <p style={{ fontSize:12, color:CLR.textSecondary, marginBottom:SP.md, lineHeight:LH.relaxed, fontFamily:FONT.sans }}>Human stays in loop. AI compresses time, expands scope, improves accuracy.</p>
                    {(dept.knowledgeWork||[]).filter(k => k.aiImpact === "supercharge").map(k => (
                      <div key={k.id} style={{ borderLeft:"2px solid #22c55e", paddingLeft:10, marginBottom:8 }}>
                        <div style={{ fontSize:12, color:CLR.textPrimary, fontFamily:FONT.sans, fontWeight:500 }}>{k.label}</div>
                        <div style={{ fontSize:11, color:CLR.textMuted, fontFamily:FONT.sans, lineHeight:LH.normal }}>{(k.aiNote || "").split(".")[0]}.</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:"#f59e0b06", border:"1px solid #f59e0b20", borderRadius:RAD.lg, padding:SP.lg }}>
                    <div style={{ color:"#f59e0b", fontWeight:700, fontSize:12, letterSpacing:LS.wide, marginBottom:SP.sm, fontFamily:FONT.sans }}>🔁 SHORTCIRCUIT — AI replaces the workflow</div>
                    <p style={{ fontSize:12, color:CLR.textSecondary, marginBottom:SP.md, lineHeight:LH.relaxed, fontFamily:FONT.sans }}>AI runs autonomously. Human handles exceptions only.</p>
                    {(dept.knowledgeWork||[]).filter(k => k.aiImpact === "shortcircuit").map(k => (
                      <div key={k.id} style={{ borderLeft:"2px solid #f59e0b", paddingLeft:10, marginBottom:8 }}>
                        <div style={{ fontSize:12, color:CLR.textPrimary, fontFamily:FONT.sans, fontWeight:500 }}>{k.label}</div>
                        <div style={{ fontSize:11, color:CLR.textMuted, fontFamily:FONT.sans, lineHeight:LH.normal }}>{(k.aiNote || "").split(".")[0]}.</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AGENTS — detail shown in map area above */}
            {activeTab === "agents" && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:CLR.textMuted, fontFamily:FONT.sans, fontSize:13 }}>
                Agent architecture is displayed in the map above. Click an agent node to inspect.
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
