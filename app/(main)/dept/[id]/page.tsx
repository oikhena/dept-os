"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import type { Advisor } from "../../../../types/department";
import { TXT, SP, RAD, LS, LH, FONT, MAP, DETAIL, CLR, GRAY, MOTION, SHADOW, T } from "../../../../styles/tokens";
import { VALUE_FLOW_COLORS, VALUE_FLOW_LABELS, SENSE_COLORS, SENSE_ICONS } from "../../../../data/constants";
import { DEPARTMENTS } from "../../../../data/templates";
import { computeAdvisors } from "../../../../hooks/useAdvisors";
import { useApp } from "../../../context/AppContext";
import { createClient } from "../../../../lib/supabase/client";
import { updateDepartment } from "../../../../lib/supabase/departments";
import type { Department } from "../../../../types/department";
import OperationalMap from "../../../../components/canvas/OperationalMap";
import AgentsTab from "../../../../components/canvas/AgentsTab";
import DeptMapTab from "../../../../components/canvas/DeptMapTab";
import DeptChat from "../../../../components/chat/DeptChat";
import ReportModal from "../../../../components/report/ReportModal";
import { Tabs } from "../../../../components/ui/Tabs";
import { Button } from "../../../../components/ui/Button";
import { Badge } from "../../../../components/ui/Badge";
import { IconButton } from "../../../../components/ui/IconButton";
import { EmptyState } from "../../../../components/ui/EmptyState";
import { Skeleton } from "../../../../components/ui/Skeleton";
import { EffortByRoleChart } from "../../../../components/charts/EffortByRoleChart";
import { AIImpactDonut } from "../../../../components/charts/AIImpactDonut";
import { CostByTaskChart } from "../../../../components/charts/CostByTaskChart";

// Tab mapping: old 7 tabs → new 3 views
// operations = overview + sensors + value-flows + map
// analysis = knowledge + ai-impact
// agents = agents
const VIEW_TABS = [
  { id: "operations", label: "Operations" },
  { id: "analysis", label: "Analysis" },
  { id: "agents", label: "Agents" },
];

// Map old tab IDs to new views for backward compat with URL params
const TAB_TO_VIEW: Record<string, string> = {
  overview: "operations", sensors: "operations", "value-flows": "operations", map: "operations",
  knowledge: "analysis", "ai-impact": "analysis",
  agents: "agents",
};

export default function DeptPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  const { savedDepts, setSavedDepts, setAdvisors, activeTab, setActiveTab } = useApp();

  const isBuiltIn = id in DEPARTMENTS;
  const baseDept = isBuiltIn
    ? DEPARTMENTS[id]
    : savedDepts.find(s => s.id === id)?.department;

  const isSaved = !isBuiltIn;
  const savedEntry = isSaved ? savedDepts.find(s => s.id === id) : null;

  const [refinedDept, setRefinedDept] = useState<Department | null>(null);
  const dept = refinedDept ?? baseDept;

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedSense, setSelectedSense] = useState<string | null>(null);
  const [selectedValueFlow, setSelectedValueFlow] = useState<string | null>(null);
  const [hoveredWorkflow, setHoveredWorkflow] = useState<string | null>(null);
  const [pulsePhase, setPulsePhase] = useState(0);
  const animRef = useRef<number>(0);
  const [showGoogleMap, setShowGoogleMap] = useState(false);

  // Active view (3-tab system)
  const activeView = TAB_TO_VIEW[activeTab] || activeTab || "operations";

  // Resizable split
  const [splitPct, setSplitPct] = useState(60);
  const draggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Sync from URL params
  useEffect(() => {
    const tab = searchParams.get("tab");
    const filter = searchParams.get("filter");
    if (tab) {
      // Map old tab names to new view system
      setActiveTab(TAB_TO_VIEW[tab] || tab);
    }
    if (filter) setSelectedValueFlow(filter);
  }, [searchParams, setActiveTab]);

  // Reset on dept change
  useEffect(() => {
    setSelectedNode(null);
    setSelectedSense(null);
    setSelectedValueFlow(null);
    setRefinedDept(null);
    setShowGoogleMap(false);
  }, [id]);

  const handleRefinement = useCallback(async (refined: Department) => {
    setRefinedDept(refined);
    if (isSaved && savedEntry) {
      try {
        const supabase = createClient();
        await updateDepartment(supabase, savedEntry.id, refined);
        setSavedDepts(prev => prev.map(s => s.id === savedEntry.id ? { ...s, department: refined } : s));
      } catch (err) {
        console.error("Failed to persist refinement:", err);
      }
    }
  }, [isSaved, savedEntry, setSavedDepts]);

  // Pulse animation
  useEffect(() => {
    let f = 0;
    const tick = () => { f = (f + 1) % 360; setPulsePhase(f); animRef.current = requestAnimationFrame(tick); };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current!);
  }, []);

  // Sync advisors
  const advisors = useMemo(() => dept ? computeAdvisors(dept) : [], [dept]);
  useEffect(() => {
    setAdvisors(advisors);
    return () => setAdvisors([]);
  }, [advisors, setAdvisors]);

  // Resize handle
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientY - rect.top) / rect.height) * 100;
      setSplitPct(Math.max(25, Math.min(80, pct)));
    };
    const onUp = () => {
      draggingRef.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  // Loading skeleton
  if (!dept) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <div style={{ height: 56, background: T.bgPrimary, borderBottom: `1px solid ${T.borderDefault}`, padding: "0 20px", display: "flex", alignItems: "center", gap: 12 }}>
          <Skeleton width={28} height={28} borderRadius={RAD.lg} />
          <Skeleton width={200} height={18} />
        </div>
        <div style={{ flex: 1, background: MAP.bg }} />
      </div>
    );
  }

  const accentColor = dept.color || "#00b4d8";
  const getRoleById = (rid: string) => dept.roles?.find(r => r.id === rid);

  const selectedRole = selectedNode ? dept.roles?.find(r => r.id === selectedNode) : null;
  const roleSensors = selectedNode ? (dept.sensors || []).filter(s => s.role === selectedNode) : [];
  const roleKnowledge = selectedNode ? (dept.knowledgeWork || []).filter(k => k.role === selectedNode) : [];
  const roleWorkflows = selectedNode ? (dept.workflows || []).filter(w => w.from === selectedNode || w.to === selectedNode) : [];
  const filteredSensors = selectedSense ? (dept.sensors || []).filter(s => s.sense === selectedSense) : (dept.sensors || []);
  const filteredWorkflows = selectedValueFlow ? (dept.workflows || []).filter(w => w.valueFlow === selectedValueFlow) : (dept.workflows || []);

  const tabsWithCounts = VIEW_TABS.map(t => ({
    ...t,
    count: t.id === "agents" ? (dept.agents?.length || 0) : undefined,
  }));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>

      {/* ── HEADER ── */}
      <div style={{
        background: T.bgPrimary, borderBottom: `1px solid ${T.borderDefault}`,
        padding: "0 20px", display: "flex", alignItems: "center",
        height: 56, flexShrink: 0, gap: 12,
      }}>
        <span style={{ fontSize: 22 }}>{dept.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.sans, fontSize: TXT.lg, fontWeight: 700, color: T.textPrimary }}>
            {dept.label}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans }}>
            <span>{dept.roles?.length || 0} roles</span>
            <span style={{ color: GRAY[300] }}>·</span>
            <span>{dept.workflows?.length || 0} flows</span>
            <span style={{ color: GRAY[300] }}>·</span>
            <span>{dept.sensors?.length || 0} sensors</span>
            <span style={{ color: GRAY[300] }}>·</span>
            <span>{dept.agents?.length || 0} agents</span>
            {dept.region && (
              <>
                <span style={{ color: GRAY[300] }}>·</span>
                <span style={{ color: GRAY[400] }}>{dept.region}</span>
              </>
            )}
            {dept.infrastructure && (
              <Badge
                label={dept.infrastructure}
                color={dept.infrastructure === "mobile-first" ? "#34d399" : dept.infrastructure === "limited-connectivity" ? "#f59e0b" : "#60a5fa"}
                icon="📶"
              />
            )}
            {isSaved && savedEntry?.kind === "generated" && (
              <Badge label="AI-generated" color={CLR.success} icon="✦" />
            )}
            {dept._citations && dept._citations.length > 0 ? (
              <Badge label="Data-grounded" color="#22c55e" icon="◉" />
            ) : (
              <Badge label="AI-estimated" color={GRAY[400]} icon="◎" />
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
          <Button variant="secondary" size="sm" onClick={() => setReportOpen(true)}>
            ↓ Report
          </Button>
          <Button
            variant={chatOpen ? "primary" : "secondary"}
            size="sm"
            onClick={() => setChatOpen(o => !o)}
            style={chatOpen ? { background: accentColor, borderColor: accentColor } : {}}
          >
            💬 Chat
          </Button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", minHeight: 0 }}>
        <div ref={containerRef} style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

          {/* MAP AREA */}
          <div style={{ height: `${splitPct}%`, flexShrink: 0, position: "relative" }}>
            {activeView === "agents" ? (
              <div style={{ height: "100%", background: T.bgPrimary, overflowY: "auto" }}>
                <AgentsTab dept={dept} accentColor={accentColor} pulsePhase={pulsePhase} onUpdateDept={handleRefinement} />
              </div>
            ) : showGoogleMap ? (
              <div style={{ height: "100%", position: "relative" }}>
                <DeptMapTab dept={dept} accentColor={accentColor} />
                <IconButton label="Back to operational map" onClick={() => setShowGoogleMap(false)}
                  size={32} style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none" }}>
                  ←
                </IconButton>
              </div>
            ) : (
              <OperationalMap
                dept={dept}
                activeTab={activeView}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                selectedValueFlow={selectedValueFlow}
                hoveredWorkflow={hoveredWorkflow}
                setHoveredWorkflow={setHoveredWorkflow}
                pulsePhase={pulsePhase}
                accentColor={accentColor}
                onRolesUpdate={roles => handleRefinement({ ...dept, roles })}
              />
            )}
            {/* Google Map toggle on operations view */}
            {activeView === "operations" && !showGoogleMap && dept.coordinates && (
              <IconButton label="Show on Google Maps" onClick={() => setShowGoogleMap(true)}
                size={32} style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.5)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}>
                🗺
              </IconButton>
            )}
          </div>

          {/* RESIZE HANDLE */}
          <div
            onMouseDown={handleDragStart}
            title="Drag to resize"
            style={{
              height: 8, cursor: "row-resize",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: T.bgSecondary,
              borderTop: `1px solid ${T.borderDefault}`,
              borderBottom: `1px solid ${T.borderDefault}`,
              transition: `background ${MOTION.fast}`,
              flexShrink: 0,
              userSelect: "none",
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.bgSurface}
            onMouseLeave={e => e.currentTarget.style.background = T.bgSecondary}
          >
            <div style={{
              width: 32, height: 3, borderRadius: 2,
              background: GRAY[300],
            }} />
          </div>

          {/* TAB BAR */}
          <Tabs
            tabs={tabsWithCounts}
            active={activeView}
            onChange={setActiveTab}
            accentColor={accentColor}
          />

          {/* ── DETAIL PANEL ── */}
          <div role="tabpanel" style={{ flex: 1, overflowY: "auto", padding: 20, background: T.bgPrimary, minHeight: 0 }}>

            {/* ═══ OPERATIONS VIEW ═══ */}
            {activeView === "operations" && (
              <div>
                {/* Summary + value chain */}
                <div style={{ marginBottom: SP.xl }}>
                  <div style={{ fontSize: TXT.md, color: T.textSecondary, lineHeight: LH.relaxed, fontFamily: FONT.sans, marginBottom: SP.md }}>{dept.summary}</div>
                  {dept.valueChain?.[0] && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                      {dept.valueChain[0].split("→").map((step, i, arr) => (
                        <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ background: accentColor + "12", border: `1px solid ${accentColor}30`, color: accentColor, padding: "3px 10px", borderRadius: RAD.full, fontSize: TXT.xs, fontFamily: FONT.sans, fontWeight: 500, whiteSpace: "nowrap" }}>{step.trim()}</span>
                          {i < arr.length - 1 && <span style={{ color: GRAY[300], fontSize: TXT.sm }}>→</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Filter bar: value flows + sensors */}
                <div style={{ display: "flex", gap: 6, marginBottom: SP.lg, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: TXT.xs, color: GRAY[400], fontFamily: FONT.sans, fontWeight: 600, letterSpacing: LS.wide, marginRight: 4 }}>FILTER</span>
                  {Object.entries(VALUE_FLOW_LABELS).map(([k, v]) => (
                    <button key={k} onClick={() => setSelectedValueFlow(selectedValueFlow === k ? null : k)}
                      style={{
                        background: selectedValueFlow === k ? VALUE_FLOW_COLORS[k] + "18" : "transparent",
                        border: `1px solid ${selectedValueFlow === k ? VALUE_FLOW_COLORS[k] : GRAY[200]}`,
                        color: selectedValueFlow === k ? VALUE_FLOW_COLORS[k] : GRAY[500],
                        padding: "4px 12px", borderRadius: RAD.full, cursor: "pointer",
                        fontSize: TXT.sm, fontFamily: FONT.sans, fontWeight: 500,
                        transition: `all ${MOTION.fast}`,
                      }}>
                      {v}
                    </button>
                  ))}
                  <div style={{ width: 1, height: 16, background: GRAY[200], margin: "0 4px" }} />
                  {(["sight", "sound", "smell", "touch"] as const).map(sense => (
                    <button key={sense} onClick={() => setSelectedSense(selectedSense === sense ? null : sense)}
                      style={{
                        background: selectedSense === sense ? SENSE_COLORS[sense] + "18" : "transparent",
                        border: `1px solid ${selectedSense === sense ? SENSE_COLORS[sense] : GRAY[200]}`,
                        color: selectedSense === sense ? SENSE_COLORS[sense] : GRAY[500],
                        padding: "4px 12px", borderRadius: RAD.full, cursor: "pointer",
                        fontSize: TXT.sm, fontFamily: FONT.sans, fontWeight: 500,
                        transition: `all ${MOTION.fast}`,
                      }}>
                      {SENSE_ICONS[sense]} {sense}
                    </button>
                  ))}
                </div>

                {/* Selected role detail */}
                {selectedRole && (
                  <div style={{
                    background: T.bgSecondary, border: `1px solid ${accentColor}20`,
                    borderRadius: RAD.lg, padding: SP.xl, marginBottom: SP.xl,
                    boxShadow: T.shadowSm,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: SP.lg }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 28 }}>{selectedRole.icon}</span>
                        <div>
                          <div style={{ fontSize: TXT.lg, fontWeight: 700, color: T.textPrimary, fontFamily: FONT.sans }}>{selectedRole.label}</div>
                          <div style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans }}>{roleWorkflows.length} flows · {roleSensors.length} sensors · {roleKnowledge.length} tasks</div>
                        </div>
                      </div>
                      <IconButton label="Deselect role" onClick={() => setSelectedNode(null)} size={28} variant="ghost">✕</IconButton>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: SP.lg }}>
                      {roleWorkflows.length > 0 && (
                        <div>
                          <div style={{ fontSize: TXT.xs, color: accentColor, letterSpacing: LS.wide, marginBottom: SP.sm, fontFamily: FONT.sans, fontWeight: 600 }}>WORKFLOWS</div>
                          {roleWorkflows.map(wf => {
                            const isFrom = wf.from === selectedNode;
                            const other = getRoleById(isFrom ? wf.to : wf.from);
                            const vfc = VALUE_FLOW_COLORS[wf.valueFlow];
                            return (
                              <div key={wf.id} style={{ borderLeft: `2px solid ${vfc}`, paddingLeft: 10, marginBottom: 8 }}>
                                <div style={{ fontSize: TXT.md, color: T.textPrimary, fontFamily: FONT.sans }}>{wf.label}</div>
                                <div style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans }}>{isFrom ? "→" : "←"} {other?.label}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {roleSensors.length > 0 && (
                        <div>
                          <div style={{ fontSize: TXT.xs, color: CLR.purple, letterSpacing: LS.wide, marginBottom: SP.sm, fontFamily: FONT.sans, fontWeight: 600 }}>SENSORS</div>
                          {roleSensors.map(s => (
                            <div key={s.id} style={{ borderLeft: `2px solid ${SENSE_COLORS[s.sense]}`, paddingLeft: 10, marginBottom: 8 }}>
                              <div style={{ fontSize: TXT.md, color: T.textPrimary, fontFamily: FONT.sans }}>{s.label}</div>
                              <div style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans }}>{s.sense}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {roleKnowledge.length > 0 && (
                        <div>
                          <div style={{ fontSize: TXT.xs, color: CLR.success, letterSpacing: LS.wide, marginBottom: SP.sm, fontFamily: FONT.sans, fontWeight: 600 }}>TASKS</div>
                          {roleKnowledge.map(k => (
                            <div key={k.id} style={{ borderLeft: `2px solid ${k.aiImpact === "supercharge" ? CLR.success : CLR.warning}`, paddingLeft: 10, marginBottom: 8 }}>
                              <div style={{ fontSize: TXT.md, color: T.textPrimary, fontFamily: FONT.sans }}>{k.label}</div>
                              <Badge label={k.aiImpact === "supercharge" ? "supercharge" : "shortcircuit"}
                                color={k.aiImpact === "supercharge" ? CLR.success : CLR.warning}
                                icon={k.aiImpact === "supercharge" ? "⚡" : "🔁"} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Value flows list (when filter active or no role selected) */}
                {(selectedValueFlow || selectedSense) && !selectedRole && (
                  <div>
                    {selectedValueFlow && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: SP.xl }}>
                        {filteredWorkflows.map(wf => {
                          const from = getRoleById(wf.from), to = getRoleById(wf.to), vfc = VALUE_FLOW_COLORS[wf.valueFlow];
                          return (
                            <div key={wf.id} style={{ display: "flex", gap: 0, border: `1px solid ${T.borderDefault}`, borderRadius: RAD.lg, overflow: "hidden" }}>
                              <div style={{ width: 5, background: vfc, flexShrink: 0 }} />
                              <div style={{ flex: 1, padding: "10px 16px", display: "flex", alignItems: "center", gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: TXT.md, fontWeight: 600, color: T.textPrimary, fontFamily: FONT.sans }}>{wf.label}</div>
                                  <div style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans, marginTop: 2 }}>{from?.icon} {from?.label} <span style={{ color: vfc }}>→</span> {to?.icon} {to?.label}</div>
                                </div>
                                <Badge label={VALUE_FLOW_LABELS[wf.valueFlow]} color={vfc} />
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: wf.aiImpact === "high" ? CLR.success : CLR.warning }} />
                                  <span style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans }}>{wf.aiImpact}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {selectedSense && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {filteredSensors.map(sensor => {
                          const sc = SENSE_COLORS[sensor.sense] || "#94a3b8";
                          return (
                            <div key={sensor.id} style={{ display: "flex", gap: 0, border: `1px solid ${T.borderDefault}`, borderRadius: RAD.lg, overflow: "hidden" }}>
                              <div style={{ width: 52, background: sc + "10", borderRight: `3px solid ${sc}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 0", flexShrink: 0 }}>
                                <span style={{ fontSize: 18 }}>{sensor.icon || SENSE_ICONS[sensor.sense]}</span>
                                <span style={{ fontSize: TXT.xs, color: sc, fontFamily: FONT.sans, fontWeight: 600, letterSpacing: LS.wide, marginTop: 3 }}>{sensor.sense?.toUpperCase()}</span>
                              </div>
                              <div style={{ flex: 1, padding: "10px 16px", minWidth: 0 }}>
                                <div style={{ fontSize: TXT.md, fontWeight: 600, color: T.textPrimary, fontFamily: FONT.sans, marginBottom: 2 }}>{sensor.label}</div>
                                <div style={{ fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans, marginBottom: 2 }}>{sensor.detail}</div>
                                <span style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans }}>{getRoleById(sensor.role)?.icon} {getRoleById(sensor.role)?.label}</span>
                              </div>
                              <div style={{ width: 260, background: `${CLR.success}06`, borderLeft: `1px solid ${T.borderDefault}`, padding: "10px 14px", flexShrink: 0, display: "flex", alignItems: "center" }}>
                                <div style={{ fontSize: TXT.sm, color: CLR.success, lineHeight: LH.normal, fontFamily: FONT.sans }}>🤖 {sensor.aiNote}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ═══ ANALYSIS VIEW ═══ */}
            {activeView === "analysis" && (
              <div>
                {/* Summary stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: SP.xl }}>
                  {[
                    { label: "KNOWLEDGE TASKS", value: (dept.knowledgeWork || []).length, color: accentColor },
                    { label: "SENSOR POINTS", value: (dept.sensors || []).length, color: CLR.purple },
                    { label: "SUPERCHARGE", value: (dept.knowledgeWork || []).filter(k => k.aiImpact === "supercharge").length, color: CLR.success },
                    { label: "SHORTCIRCUIT", value: (dept.knowledgeWork || []).filter(k => k.aiImpact === "shortcircuit").length, color: CLR.warning },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      background: T.bgSecondary, border: `1px solid ${stat.color}20`,
                      borderRadius: RAD.lg, padding: "12px 16px", textAlign: "center",
                    }}>
                      <div style={{ fontSize: TXT.stat, fontWeight: 700, color: stat.color, fontFamily: FONT.mono }}>{stat.value}</div>
                      <div style={{ fontSize: TXT.xs, color: GRAY[500], fontFamily: FONT.sans, fontWeight: 600, letterSpacing: LS.wide }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* ── Charts ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: SP.xl }}>
                  <EffortByRoleChart knowledgeWork={dept.knowledgeWork || []} roles={dept.roles || []} accentColor={accentColor} />
                  <AIImpactDonut knowledgeWork={dept.knowledgeWork || []} />
                </div>
                <div style={{ marginBottom: SP.xl }}>
                  <CostByTaskChart knowledgeWork={dept.knowledgeWork || []} />
                </div>

                {/* Knowledge task table */}
                {(dept.knowledgeWork || []).length > 0 ? (
                  <div style={{ border: `1px solid ${T.borderDefault}`, borderRadius: RAD.lg, overflow: "hidden", marginBottom: SP.xl }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 80px 90px 100px", gap: 0, background: T.bgSecondary, borderBottom: `1px solid ${T.borderDefault}`, padding: "8px 16px" }}>
                      {["TASK", "ROLE", "EFFORT", "FREQ", "AI IMPACT", "COST/YR"].map(h => (
                        <div key={h} style={{ fontSize: TXT.xs, fontFamily: FONT.sans, fontWeight: 600, color: GRAY[500], letterSpacing: LS.wide }}>{h}</div>
                      ))}
                    </div>
                    {(dept.knowledgeWork || []).map((kw, i) => (
                      <div key={kw.id} style={{
                        display: "grid", gridTemplateColumns: "1fr 120px 80px 80px 90px 100px",
                        gap: 0, padding: "10px 16px",
                        borderBottom: i < (dept.knowledgeWork || []).length - 1 ? `1px solid ${T.borderDefault}` : "none",
                        background: i % 2 === 0 ? T.bgPrimary : T.bgSecondary,
                      }}>
                        <div>
                          <div style={{ fontSize: TXT.md, fontWeight: 500, color: T.textPrimary, fontFamily: FONT.sans }}>{kw.label}</div>
                          {kw.valueAtStake && <div style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans, marginTop: 1 }}>{kw.valueAtStake}</div>}
                        </div>
                        <div style={{ fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans, display: "flex", alignItems: "center", gap: 4 }}>{getRoleById(kw.role)?.icon} {getRoleById(kw.role)?.label}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {Array.from({ length: 10 }).map((_, j) => <div key={j} style={{ width: 3, height: 12, borderRadius: 1, background: j < kw.effort ? accentColor : GRAY[200] }} />)}
                          <span style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.mono, marginLeft: 4 }}>{kw.effort}</span>
                        </div>
                        <div style={{ fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans, display: "flex", alignItems: "center" }}>{kw.frequency}</div>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <Badge
                            label={kw.aiImpact === "supercharge" ? "SUPER" : "SHORT"}
                            color={kw.aiImpact === "supercharge" ? CLR.success : CLR.warning}
                            icon={kw.aiImpact === "supercharge" ? "⚡" : "🔁"}
                          />
                        </div>
                        <div style={{ fontSize: TXT.sm, color: CLR.danger, fontFamily: FONT.mono, display: "flex", alignItems: "center" }}>{kw.costPerYear || "—"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon="📋" title="No knowledge tasks" description="Knowledge tasks represent cognitive work patterns that AI can augment or replace." />
                )}

                {/* AI Impact breakdown */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: `${CLR.success}06`, border: `1px solid ${CLR.success}20`, borderRadius: RAD.lg, padding: SP.xl }}>
                    <div style={{ color: CLR.success, fontWeight: 700, fontSize: TXT.md, letterSpacing: LS.wide, marginBottom: SP.sm, fontFamily: FONT.sans }}>⚡ SUPERCHARGE — AI amplifies the human</div>
                    <p style={{ fontSize: TXT.sm, color: T.textSecondary, marginBottom: SP.lg, lineHeight: LH.relaxed, fontFamily: FONT.sans }}>Human stays in loop. AI compresses time, expands scope, improves accuracy.</p>
                    {(dept.knowledgeWork || []).filter(k => k.aiImpact === "supercharge").map(k => (
                      <div key={k.id} style={{ borderLeft: `2px solid ${CLR.success}`, paddingLeft: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: TXT.md, color: T.textPrimary, fontFamily: FONT.sans, fontWeight: 500 }}>{k.label}</div>
                        <div style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans, lineHeight: LH.normal }}>{(k.aiNote || "").split(".")[0]}.</div>
                      </div>
                    ))}
                    {(dept.knowledgeWork || []).filter(k => k.aiImpact === "supercharge").length === 0 && (
                      <div style={{ fontSize: TXT.sm, color: GRAY[400], fontFamily: FONT.sans }}>No supercharge opportunities identified.</div>
                    )}
                  </div>
                  <div style={{ background: `${CLR.warning}06`, border: `1px solid ${CLR.warning}20`, borderRadius: RAD.lg, padding: SP.xl }}>
                    <div style={{ color: CLR.warning, fontWeight: 700, fontSize: TXT.md, letterSpacing: LS.wide, marginBottom: SP.sm, fontFamily: FONT.sans }}>🔁 SHORTCIRCUIT — AI replaces the workflow</div>
                    <p style={{ fontSize: TXT.sm, color: T.textSecondary, marginBottom: SP.lg, lineHeight: LH.relaxed, fontFamily: FONT.sans }}>AI runs autonomously. Human handles exceptions only.</p>
                    {(dept.knowledgeWork || []).filter(k => k.aiImpact === "shortcircuit").map(k => (
                      <div key={k.id} style={{ borderLeft: `2px solid ${CLR.warning}`, paddingLeft: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: TXT.md, color: T.textPrimary, fontFamily: FONT.sans, fontWeight: 500 }}>{k.label}</div>
                        <div style={{ fontSize: TXT.sm, color: GRAY[500], fontFamily: FONT.sans, lineHeight: LH.normal }}>{(k.aiNote || "").split(".")[0]}.</div>
                      </div>
                    ))}
                    {(dept.knowledgeWork || []).filter(k => k.aiImpact === "shortcircuit").length === 0 && (
                      <div style={{ fontSize: TXT.sm, color: GRAY[400], fontFamily: FONT.sans }}>No shortcircuit opportunities identified.</div>
                    )}
                  </div>
                </div>

                {/* ── Data Sources ── */}
                {dept._citations && dept._citations.length > 0 && (
                  <div style={{
                    marginTop: SP.xl,
                    border: `1px solid ${T.borderDefault}`,
                    borderRadius: RAD.lg,
                    padding: `${SP.md}px ${SP.lg}px`,
                    background: T.bgSecondary,
                  }}>
                    <div style={{
                      fontSize: TXT.xs, fontFamily: FONT.mono, fontWeight: 600,
                      color: T.textMuted, letterSpacing: LS.wide,
                      textTransform: "uppercase", marginBottom: SP.sm,
                    }}>
                      Data Sources
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: `${SP.xs}px ${SP.lg}px` }}>
                      {dept._citations.map(c => (
                        <div key={c.id} style={{ fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans }}>
                          <span style={{ color: T.textMuted, fontFamily: FONT.mono, fontSize: TXT.xs }}>[{c.id}]</span>{" "}
                          {c.url ? (
                            <a href={c.url} target="_blank" rel="noopener noreferrer"
                              style={{ color: CLR.info, textDecoration: "none" }}
                              onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                              onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>
                              {c.label}
                            </a>
                          ) : c.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ AGENTS VIEW ═══ */}
            {activeView === "agents" && (
              (dept.agents?.length || 0) > 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: GRAY[500], fontFamily: FONT.sans, fontSize: TXT.md }}>
                  Agent architecture is displayed in the map above. Click an agent node to inspect.
                </div>
              ) : (
                <EmptyState icon="🤖" title="No agents configured" description="Agents are AI-powered automations that can be deployed to handle high-impact tasks." />
              )
            )}
          </div>
        </div>

        {/* CHAT PANEL */}
        {chatOpen && dept && (
          <DeptChat dept={dept} accentColor={accentColor} savedDeptId={savedEntry?.id} onClose={() => setChatOpen(false)} onRefinement={handleRefinement} />
        )}
      </div>

      {reportOpen && dept && (
        <ReportModal dept={dept} onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}
