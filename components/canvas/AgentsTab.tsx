"use client";
import { useState } from "react";
import type { Department, Agent } from "../../types/department";
import { TXT, SP, RAD, LS, LH } from "../../styles/tokens";
import { AGENT_TYPES } from "../../data/constants";
import AgentPrototypeModal from "../agents/AgentPrototypeModal";

interface AgentsTabProps {
  dept: Department;
  accentColor: string;
  pulsePhase: number;
}

const LANE_ORDER = ["edge","mobile","web","orch"] as const;
const LANE_Y: Record<string, number> = { edge:14, mobile:36, web:58, orch:80 };
const LANE_LABEL_Y: Record<string, number> = { edge:8, mobile:30, web:52, orch:74 };
const LANE_COLORS: Record<string, string> = { edge:"#34d399", mobile:"#a78bfa", web:"#38bdf8", orch:"#f59e0b" };

function buildAgentLayout(agents: Agent[]) {
  const byLane: Record<string, Agent[]> = {};
  LANE_ORDER.forEach(l => { byLane[l] = []; });
  agents.forEach(a => { (byLane[a.type] = byLane[a.type]||[]).push(a); });
  const positions: Record<string, {x:number, y:number, lane:string}> = {};
  LANE_ORDER.forEach(lane => {
    const group = byLane[lane]||[];
    group.forEach((a, i) => {
      const total = group.length;
      const x = total === 1 ? 50 : 12 + (i / (total-1)) * 76;
      positions[a.id] = { x, y: LANE_Y[lane]||50, lane };
    });
  });
  return positions;
}

function inferEdges(agents: Agent[]) {
  const edges: {from:string, to:string, shared:number}[] = [];
  for (let i = 0; i < agents.length; i++) {
    for (let j = i+1; j < agents.length; j++) {
      const a = agents[i], b = agents[j];
      const aIds = new Set(a.taskIds||[]);
      const bIds = new Set(b.taskIds||[]);
      const shared = [...aIds].filter(id => bIds.has(id)).length;
      const aLane = LANE_ORDER.indexOf(a.type as any), bLane = LANE_ORDER.indexOf(b.type as any);
      const laneAdj = Math.abs(aLane - bLane) === 1;
      if (shared > 0 || (laneAdj && (a.type==="orch"||b.type==="orch"))) {
        const from = aLane <= bLane ? a.id : b.id;
        const to   = aLane <= bLane ? b.id : a.id;
        edges.push({ from, to, shared });
      }
    }
  }
  return edges;
}

export default function AgentsTab({ dept, accentColor, pulsePhase }: AgentsTabProps) {
  const [sel, setSel] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  const [prototyping, setPrototyping] = useState<Agent | null>(null);
  const agents = dept.agents || [];

  const noAgents = !agents.length;

  const positions = noAgents ? {} : buildAgentLayout(agents);
  const edges = noAgents ? [] : inferEdges(agents);

  const selAgent = sel ? agents.find(a => a.id === sel) : null;
  const at = selAgent ? (AGENT_TYPES[selAgent.type]||AGENT_TYPES.web) : null;

  const getTaskDetails = (agent: Agent) => ({
    kw:   (agent.taskIds||[]).map(id => (dept.knowledgeWork||[]).find(k => k.id===id)).filter(Boolean),
    sens: (agent.taskIds||[]).map(id => (dept.sensors||[]).find(s => s.id===id)).filter(Boolean),
  });

  // Complexity → ring thickness
  const complexityRing: Record<string, number> = { low:1, medium:2, high:3.5 };

  // Priority → glow intensity
  const priorityGlow = (p: number) => Math.max(0, (5 - (p||5)) / 4);

  const vbW = 100, vbH = 95;

  return (
    <div style={{ display:"flex", gap:0, minHeight:500 }}>

      {/* ── LEFT: SVG MAP ── */}
      <div style={{ flex:1, minWidth:0 }}>

        {/* Legend strip */}
        <div style={{ display:"flex", gap:SP.lg, padding:`0 0 ${SP.sm}px 0`, flexWrap:"wrap" }}>
          {LANE_ORDER.map(type => {
            const at = AGENT_TYPES[type];
            return (
              <div key={type} style={{ display:"flex", alignItems:"center", gap:SP.xs }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:at.color, boxShadow:`0 0 5px ${at.color}60` }} />
                <span style={{ fontSize:TXT.sm, color:at.color, letterSpacing:LS.normal }}>{at.icon} {at.label.toUpperCase()}</span>
              </div>
            );
          })}
          <div style={{ marginLeft:"auto", fontSize:TXT.sm, color:"#e2e8f0" }}>CLICK AGENT TO INSPECT · DATA FLOWS LEFT → RIGHT</div>
        </div>

        {noAgents ? (
          <div style={{ background:"#f8fafc", border:"1px dashed #e2e8f0", borderRadius:RAD.lg, padding:40, textAlign:"center" }}>
            <div style={{ fontSize:32, marginBottom:SP.md, opacity:0.2 }}>🤖</div>
            <div style={{ fontSize:TXT.md, color:"#cbd5e1", marginBottom:SP.sm }}>No agent architecture yet</div>
            <div style={{ fontSize:TXT.md, color:"#e2e8f0", lineHeight:LH.relaxed }}>
              Use <span style={{ color:"#22c55e" }}>⟳ Generate Any Dept</span> in the header to research<br/>
              this institution and produce a full agent map.
            </div>
          </div>
        ) : (
          <svg viewBox={`0 0 ${vbW} ${vbH}`} style={{ width:"100%", display:"block", background:"#ffffff", borderRadius:6, border:"1px solid #e2e8f0" }}>
            <defs>
              {LANE_ORDER.map(type => (
                <marker key={type} id={`arw-${type}`} markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto">
                  <path d="M0,0 L0,4 L4,2 z" fill={LANE_COLORS[type]+"99"} />
                </marker>
              ))}
              {LANE_ORDER.map(type => (
                <filter key={`glow-${type}`} id={`glow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              ))}
            </defs>

            {/* Lane backgrounds + labels */}
            {LANE_ORDER.map((type, i) => {
              const at = AGENT_TYPES[type];
              const y = (LANE_Y[type] - 10);
              return (
                <g key={type}>
                  <rect x={0} y={y} width={vbW} height={18}
                    fill={at.color} fillOpacity={0.025}
                    stroke={at.color} strokeOpacity={0.08} strokeWidth={0.3} />
                  <text x={1.5} y={y + 5.5} fill={at.color} fillOpacity={0.4}
                    fontSize="4" fontFamily="monospace" letterSpacing="0.08em">
                    {at.icon} {at.label.toUpperCase()}
                  </text>
                  {/* Lane divider */}
                  {i < LANE_ORDER.length - 1 && (
                    <line x1={0} y1={y+18} x2={vbW} y2={y+18}
                      stroke={at.color} strokeOpacity={0.12} strokeWidth={0.2} strokeDasharray="1,2" />
                  )}
                </g>
              );
            })}

            {/* Edges */}
            {edges.map((edge, i) => {
              const fp = positions[edge.from], tp = positions[edge.to];
              if (!fp || !tp) return null;
              const fromAgent = agents.find(a => a.id===edge.from);
              const fromType = fromAgent?.type||"web";
              const edgeColor = LANE_COLORS[fromType]||"#94a3b8";
              const isHov = hoveredEdge === i;
              const mx = (fp.x + tp.x) / 2;
              const my = (fp.y + tp.y) / 2 - 4;
              const pid = `ep-${i}`;
              const dur = (1.8 + i * 0.25).toFixed(2);
              return (
                <g key={i}>
                  <path id={pid}
                    d={`M ${fp.x} ${fp.y} Q ${mx} ${my} ${tp.x} ${tp.y}`}
                    fill="none"
                    stroke={isHov ? edgeColor+"cc" : edgeColor+"33"}
                    strokeWidth={isHov ? 0.6 : 0.3}
                    strokeDasharray="1.5,1"
                    markerEnd={`url(#arw-${fromType})`}
                    style={{ transition:"stroke 0.15s" }}
                  />
                  {/* Invisible hit area */}
                  <path d={`M ${fp.x} ${fp.y} Q ${mx} ${my} ${tp.x} ${tp.y}`}
                    fill="none" stroke="transparent" strokeWidth={4}
                    style={{ cursor:"default" }}
                    onMouseEnter={() => setHoveredEdge(i)}
                    onMouseLeave={() => setHoveredEdge(null)}
                  />
                  {/* Animated particle */}
                  <circle r={isHov ? 0.9 : 0.55} fill={edgeColor}
                    opacity={isHov ? 0.9 : 0.4} pointerEvents="none"
                    style={{ filter: isHov ? `drop-shadow(0 0 1.5px ${edgeColor})` : "none" }}>
                    <animateMotion dur={`${dur}s`} repeatCount="indefinite">
                      <mpath href={`#${pid}`} />
                    </animateMotion>
                  </circle>
                </g>
              );
            })}

            {/* Agent nodes */}
            {agents.map(agent => {
              const pos = positions[agent.id];
              if (!pos) return null;
              const at = AGENT_TYPES[agent.type]||AGENT_TYPES.web;
              const isSel = sel === agent.id;
              const glow = priorityGlow(agent.priority);
              const ring = complexityRing[agent.complexity]||1.5;
              const r = isSel ? 8.5 : 7;
              const hasHil = !!agent.humanInLoop;

              return (
                <g key={agent.id} onClick={() => setSel(isSel ? null : agent.id)} style={{ cursor:"pointer" }}>
                  {/* Outer complexity ring */}
                  <circle cx={pos.x} cy={pos.y} r={r + ring}
                    fill="none" stroke={at.color}
                    strokeOpacity={isSel ? 0.5 : 0.15}
                    strokeWidth={0.4}
                    strokeDasharray={agent.complexity==="high" ? "none" : "1.5,1"}
                  />
                  {/* Glow when high priority */}
                  {glow > 0.5 && (
                    <circle cx={pos.x} cy={pos.y} r={r + ring + 2}
                      fill={at.color} fillOpacity={0.04 * glow}
                      stroke="none" />
                  )}
                  {/* Main circle */}
                  <circle cx={pos.x} cy={pos.y} r={r}
                    fill={isSel ? at.color+"22" : "#f1f5f9"}
                    stroke={at.color}
                    strokeOpacity={isSel ? 1 : 0.6}
                    strokeWidth={isSel ? 0.7 : 0.4}
                    style={{ transition:"all 0.2s", filter: isSel ? `drop-shadow(0 0 3px ${at.color})` : "none" }}
                  />
                  {/* Type icon */}
                  <text x={pos.x} y={pos.y - 1.2} textAnchor="middle" fontSize="6"
                    style={{ userSelect:"none", pointerEvents:"none" }}>{at.icon}</text>
                  {/* Agent name — truncated */}
                  <text x={pos.x} y={pos.y + 13} textAnchor="middle"
                    fill={isSel ? at.color : "#64748b"}
                    fontSize="3.5" fontFamily="monospace"
                    style={{ pointerEvents:"none" }}>
                    {agent.name.length > 16 ? agent.name.slice(0,15)+"…" : agent.name}
                  </text>
                  {/* Priority badge */}
                  <circle cx={pos.x + r - 0.5} cy={pos.y - r + 0.5} r={2.5}
                    fill="#ffffff" stroke={at.color} strokeOpacity={0.5} strokeWidth={0.3} />
                  <text x={pos.x + r - 0.5} y={pos.y - r + 1.3} textAnchor="middle"
                    fill={at.color} fillOpacity={0.8} fontSize="2.8" fontFamily="monospace"
                    style={{ pointerEvents:"none" }}>P{agent.priority}</text>
                  {/* Human-in-loop indicator */}
                  {hasHil && (
                    <circle cx={pos.x - r + 0.5} cy={pos.y - r + 0.5} r={1.8}
                      fill="#ffffff" stroke="#f59e0b" strokeOpacity={0.6 + 0.4 * Math.sin((pulsePhase||0)*0.06)} strokeWidth={0.3}>
                    </circle>
                  )}
                  {hasHil && (
                    <text x={pos.x - r + 0.5} y={pos.y - r + 1.1} textAnchor="middle"
                      fontSize="2.5" style={{ pointerEvents:"none" }}>👤</text>
                  )}
                  {/* Mobile-first badge */}
                  {agent.mobileFirst && (
                    <text x={pos.x} y={pos.y + 3.5} textAnchor="middle" fontSize="3"
                      style={{ pointerEvents:"none" }} opacity={0.7}>📱</text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Data flow direction label */}
        {!noAgents && (
          <div style={{ display:"flex", alignItems:"center", gap:SP.sm, marginTop:SP.sm, opacity:0.4 }}>
            <span style={{ fontSize:TXT.sm, color:"#cbd5e1" }}>SENSOR / PHYSICAL WORLD</span>
            <div style={{ flex:1, height:1, background:"linear-gradient(to right, #34d399, #38bdf8, #a78bfa, #f59e0b)", opacity:0.4 }} />
            <span style={{ fontSize:TXT.sm, color:"#cbd5e1" }}>ORCHESTRATION / SYNTHESIS</span>
          </div>
        )}
      </div>

      {/* ── RIGHT: DETAIL PANEL ── */}
      {selAgent && at && (() => {
        const { kw, sens } = getTaskDetails(selAgent);
        return (
          <div style={{ width:280, flexShrink:0, borderLeft:"1px solid #e2e8f0", padding:`${SP.lg}px ${SP.xl}px`, overflowY:"auto", background:"#f8fafc" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:SP.lg }}>
              <div>
                <div style={{ fontSize:22, marginBottom:SP.xs }}>{at.icon}</div>
                <div style={{ fontSize:TXT.lg, color:"#1e293b", fontWeight:700, lineHeight:LH.tight }}>{selAgent.name}</div>
                <div style={{ fontSize:TXT.sm, color:at.color, marginTop:3 }}>{at.label}</div>
              </div>
              <button onClick={() => setSel(null)} style={{ background:"transparent", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:TXT.lg, padding:0 }}>✕</button>
            </div>

            {/* Prototype button — primary CTA */}
            <button onClick={() => setPrototyping(selAgent)}
              style={{ width:"100%", background:`linear-gradient(135deg, ${at.color}22, ${at.color}10)`, border:`1px solid ${at.color}66`, color:at.color, padding:"10px", borderRadius:RAD.md, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit", fontWeight:700, letterSpacing:LS.normal, marginBottom:SP.lg, display:"flex", alignItems:"center", justifyContent:"center", gap:SP.sm, transition:"all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background=`linear-gradient(135deg, ${at.color}38, ${at.color}22)`; (e.currentTarget as HTMLButtonElement).style.boxShadow=`0 0 16px ${at.color}30`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background=`linear-gradient(135deg, ${at.color}22, ${at.color}10)`; (e.currentTarget as HTMLButtonElement).style.boxShadow="none"; }}>
              <span>⚡</span> Prototype This Agent
            </button>

            {/* Priority + complexity + mobile chips */}
            <div style={{ display:"flex", gap:SP.xs, flexWrap:"wrap", marginBottom:SP.lg }}>
              <span style={{ background:at.color+"18", border:`1px solid ${at.color}40`, color:at.color, borderRadius:RAD.sm, padding:"2px 7px", fontSize:TXT.sm }}>P{selAgent.priority} priority</span>
              <span style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", color:"#64748b", borderRadius:RAD.sm, padding:"2px 7px", fontSize:TXT.sm }}>{selAgent.complexity} complexity</span>
              {selAgent.mobileFirst && <span style={{ background:"#34d39918", border:"1px solid #34d39940", color:"#34d399", borderRadius:RAD.sm, padding:"2px 7px", fontSize:TXT.sm }}>📱 mobile-first</span>}
            </div>

            {/* Trigger / Output / Human in loop */}
            {[{l:"TRIGGER",v:selAgent.trigger,c:"#60a5fa"},{l:"OUTPUT",v:selAgent.output,c:"#22c55e"},{l:"HUMAN IN LOOP",v:selAgent.humanInLoop,c:"#f59e0b"}].map(f => (
              <div key={f.l} style={{ background:"#ffffff", border:`1px solid ${f.c}20`, borderLeft:`2px solid ${f.c}`, borderRadius:RAD.sm, padding:`${SP.sm}px ${SP.sm}px`, marginBottom:SP.sm }}>
                <div style={{ fontSize:TXT.sm, color:f.c, letterSpacing:LS.wide, marginBottom:3 }}>{f.l}</div>
                <div style={{ fontSize:TXT.md, color:"#64748b", lineHeight:LH.normal }}>{f.v || "—"}</div>
              </div>
            ))}

            {/* Integrations */}
            {selAgent.integrations && selAgent.integrations.length > 0 && (
              <div style={{ marginBottom:SP.sm }}>
                <div style={{ fontSize:TXT.sm, color:"#cbd5e1", letterSpacing:LS.wide, marginBottom:SP.xs }}>INTEGRATIONS</div>
                <div style={{ display:"flex", gap:SP.xs, flexWrap:"wrap" }}>
                  {selAgent.integrations.map((x: string, i: number) => (
                    <span key={i} style={{ background:"#f1f5f9", border:"1px solid #e2e8f0", color:"#94a3b8", borderRadius:RAD.sm, padding:"2px 7px", fontSize:TXT.sm }}>{x}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks / sensors handled */}
            {(kw.length > 0 || sens.length > 0) && (
              <div>
                <div style={{ fontSize:TXT.sm, color:"#cbd5e1", letterSpacing:LS.wide, marginBottom:SP.sm }}>HANDLES</div>
                <div style={{ display:"flex", flexDirection:"column", gap:SP.xs }}>
                  {kw.map((k: any) => (
                    <div key={k.id} style={{ background:k.aiImpact==="supercharge"?"#22c55e10":"#f59e0b10", border:`1px solid ${k.aiImpact==="supercharge"?"#22c55e25":"#f59e0b25"}`, borderRadius:RAD.sm, padding:`${SP.xs}px ${SP.sm}px` }}>
                      <div style={{ fontSize:TXT.md, color:k.aiImpact==="supercharge"?"#22c55e":"#f59e0b" }}>{k.aiImpact==="supercharge"?"⚡":"🔁"} {k.label}</div>
                      {k.costPerYear && <div style={{ fontSize:TXT.sm, color:"#ef4444", marginTop:2 }}>💸 {k.costPerYear}</div>}
                    </div>
                  ))}
                  {sens.map((s: any) => (
                    <div key={s.id} style={{ background:"#a78bfa10", border:"1px solid #a78bfa25", borderRadius:RAD.sm, padding:`${SP.xs}px ${SP.sm}px` }}>
                      <div style={{ fontSize:TXT.md, color:"#a78bfa" }}>📡 {s.label}</div>
                      <div style={{ fontSize:TXT.sm, color:"#94a3b8", marginTop:1 }}>{s.sense} sensor</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Prototype modal */}
      {prototyping && (
        <AgentPrototypeModal
          agent={prototyping}
          dept={dept}
          onClose={() => setPrototyping(null)}
        />
      )}
    </div>
  );
}
