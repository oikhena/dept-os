"use client";
import type { Department } from "../../types/department";
import { MAP, FONT, CLR } from "../../styles/tokens";
import { VALUE_FLOW_COLORS, VALUE_FLOW_LABELS, SENSE_COLORS } from "../../data/constants";

interface OperationalMapProps {
  dept: Department;
  activeTab: string;
  selectedNode: string | null;
  setSelectedNode: (id: string | null) => void;
  selectedValueFlow: string | null;
  hoveredWorkflow: string | null;
  setHoveredWorkflow: (id: string | null) => void;
  pulsePhase: number;
  accentColor: string;
}

export default function OperationalMap({ dept, activeTab, selectedNode, setSelectedNode, selectedValueFlow, hoveredWorkflow, setHoveredWorkflow, pulsePhase, accentColor }: OperationalMapProps) {
  const getRoleById = (id: string) => dept.roles?.find(r => r.id === id);

  const getWorkflowPath = (wf: { from: string; to: string }) => {
    const f = getRoleById(wf.from), t = getRoleById(wf.to);
    if (!f || !t) return "";
    if (f.id === t.id) return `M ${f.x} ${f.y} Q ${f.x+15} ${f.y-15} ${f.x+2} ${f.y-6}`;
    const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2 - 8;
    return `M ${f.x} ${f.y} Q ${mx} ${my} ${t.x} ${t.y}`;
  };

  // Overlay: compute role opacity/scale per tab
  const hasSensors = (roleId: string) => (dept.sensors || []).some(s => s.role === roleId);
  const roleEffort = (roleId: string) => (dept.knowledgeWork || []).filter(k => k.role === roleId).reduce((s, k) => s + (k.effort || 0), 0);
  const maxEffort = Math.max(1, ...(dept.roles || []).map(r => roleEffort(r.id)));

  const roleOpacity = (role: { id: string }) => {
    if (activeTab === "sensors") return hasSensors(role.id) ? 1 : 0.25;
    if (activeTab === "value-flows" && selectedValueFlow) {
      const connected = (dept.workflows || []).some(w => w.valueFlow === selectedValueFlow && (w.from === role.id || w.to === role.id));
      return connected ? 1 : 0.2;
    }
    if (selectedNode && selectedNode !== role.id) {
      const connected = (dept.workflows || []).some(w => (w.from === selectedNode && w.to === role.id) || (w.to === selectedNode && w.from === role.id));
      return connected ? 0.8 : 0.2;
    }
    return 1;
  };

  const roleScale = (role: { id: string }) => {
    if (activeTab === "knowledge") return 0.7 + 0.6 * (roleEffort(role.id) / maxEffort);
    return 1;
  };

  const edgeOpacity = (wf: { from: string; to: string; valueFlow: string }) => {
    if (activeTab === "value-flows" && selectedValueFlow) return wf.valueFlow === selectedValueFlow ? 1 : 0.06;
    if (activeTab === "sensors") return 0.15;
    if (selectedNode) return (wf.from === selectedNode || wf.to === selectedNode) ? 1 : 0.08;
    return 1;
  };

  // Sensor overlay dots
  const senseColorMap: Record<string, string> = { sight:"#60a5fa", sound:"#a78bfa", smell:"#34d399", touch:"#fb923c", taste:"#f472b6" };
  const roleSensors = (roleId: string) => (dept.sensors || []).filter(s => s.role === roleId);

  const nodeSize = 6.5;

  return (
    <div style={{ width:"100%", height:"100%", background:MAP.bg, position:"relative", overflow:"hidden" }}>
      <svg viewBox="0 0 100 92" preserveAspectRatio="xMidYMid meet" style={{ width:"100%", height:"100%", display:"block" }}>
        <defs>
          {/* Dot grid pattern */}
          <pattern id="dotgrid" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="0.25" fill={MAP.grid} />
          </pattern>
          {/* Arrow markers */}
          {Object.entries(VALUE_FLOW_COLORS).map(([k, c]) => (
            <marker key={k} id={`arr-${k}`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <path d="M0,0 L0,5 L5,2.5 z" fill={c} />
            </marker>
          ))}
          <marker id="arr-dim" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0 L0,5 L5,2.5 z" fill="#475569" />
          </marker>
          {/* Drop shadow for nodes */}
          <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.4" />
          </filter>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={accentColor} floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Background grid */}
        <rect width="100" height="92" fill="url(#dotgrid)" />

        {/* Subtle center glow */}
        <radialGradient id="centerGlow" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.06" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
        <rect width="100" height="92" fill="url(#centerGlow)" />

        {/* Workflow edges */}
        {(dept.workflows || []).map((wf, idx) => {
          const isActive = hoveredWorkflow === wf.id || (selectedNode && (wf.from === selectedNode || wf.to === selectedNode));
          const vfc = VALUE_FLOW_COLORS[wf.valueFlow] || "#475569";
          const opacity = edgeOpacity(wf);
          const pid = `wfp-${wf.id}`;
          const dur = 2.2 + (idx % 4) * 0.35;
          const pCount = isActive ? 4 : 2;
          const f = getRoleById(wf.from), t = getRoleById(wf.to);
          if (!f || !t) return null;
          const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2 - 8;
          return (
            <g key={wf.id} style={{ opacity, transition:"opacity 0.4s" }}>
              {/* Hit area */}
              <path d={getWorkflowPath(wf)} fill="none" stroke="transparent" strokeWidth={4} style={{ cursor:"pointer" }}
                onMouseEnter={() => setHoveredWorkflow(wf.id)} onMouseLeave={() => setHoveredWorkflow(null)} />
              {/* Visible path */}
              <path id={pid} d={getWorkflowPath(wf)} fill="none"
                stroke={isActive ? vfc + "bb" : vfc + "55"} strokeWidth={isActive ? 0.7 : 0.35}
                strokeDasharray={wf.valueFlow === "costSink" ? "2,1.5" : wf.valueFlow === "valueLeak" ? "1,1.5" : "none"}
                markerEnd={isActive ? `url(#arr-${wf.valueFlow})` : "url(#arr-dim)"}
                style={{ transition:"stroke 0.2s, stroke-width 0.2s" }} pointerEvents="none" />
              {/* Animated particles */}
              {Array.from({ length: pCount }).map((_, i) => (
                <circle key={i} r={isActive && i === 0 ? 1 : 0.6} fill={vfc}
                  opacity={isActive ? (i === 0 ? 0.95 : 0.5) : 0.35} pointerEvents="none"
                  style={{ filter: isActive && i === 0 ? `drop-shadow(0 0 2px ${vfc})` : "none" }}>
                  <animateMotion dur={`${(dur * (0.9 + i * 0.07)).toFixed(2)}s`} repeatCount="indefinite" begin={`${-(i / pCount * dur).toFixed(2)}s`}>
                    <mpath href={`#${pid}`} />
                  </animateMotion>
                </circle>
              ))}
              {/* Hover tooltip */}
              {hoveredWorkflow === wf.id && f.id !== t.id && (
                <g>
                  <rect x={mx - 16} y={my - 7} width={32} height={7} rx={2} fill={MAP.labelBg} stroke={vfc} strokeWidth={0.2} strokeOpacity={0.5} />
                  <text x={mx} y={my - 2} textAnchor="middle" fill={CLR.textOnDarkBright} fontSize="2.6" fontFamily={FONT.mono}>{wf.label}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* Role nodes */}
        {(dept.roles || []).map(role => {
          const isSel = selectedNode === role.id;
          const scale = roleScale(role);
          const opacity = roleOpacity(role);
          const s = nodeSize * scale;
          const senses = roleSensors(role.id);

          return (
            <g key={role.id} onClick={() => setSelectedNode(isSel ? null : role.id)} style={{ cursor:"pointer", opacity, transition:"opacity 0.4s" }}>
              {/* Rounded square node */}
              <rect x={role.x - s} y={role.y - s} width={s * 2} height={s * 2} rx={MAP.nodeRadius * scale * 0.15}
                fill={isSel ? accentColor + "30" : MAP.nodeBg}
                stroke={isSel ? accentColor : MAP.nodeBorder}
                strokeWidth={isSel ? 0.7 : 0.4}
                filter={isSel ? "url(#nodeGlow)" : "url(#nodeShadow)"}
                style={{ transition:"all 0.3s" }} />
              {/* Emoji */}
              <text x={role.x} y={role.y + 1.5} textAnchor="middle" fontSize={5.5 * scale} style={{ userSelect:"none", pointerEvents:"none" }}>{role.icon}</text>
              {/* Label chip */}
              <rect x={role.x - 12} y={role.y + s + 1.5} width={24} height={5} rx={1.5} fill={MAP.labelBg} />
              <text x={role.x} y={role.y + s + 5} textAnchor="middle" fill={isSel ? accentColor : CLR.textOnDark} fontSize="2.6" fontFamily={FONT.mono}
                style={{ pointerEvents:"none", letterSpacing:"0.03em" }}>{role.label.length > 18 ? role.label.slice(0, 17) + "\u2026" : role.label}</text>

              {/* Sensor overlay dots (visible on sensors tab or when selected) */}
              {(activeTab === "sensors" || isSel) && senses.map((s, si) => {
                const angle = (si / Math.max(1, senses.length)) * Math.PI * 2 - Math.PI / 2;
                const orbitR = s ? nodeSize * scale + 3 : 0;
                const sx = role.x + Math.cos(angle + pulsePhase * 0.02) * orbitR;
                const sy = role.y + Math.sin(angle + pulsePhase * 0.02) * orbitR;
                return (
                  <circle key={s.id} cx={sx} cy={sy} r={1.2}
                    fill={senseColorMap[s.sense] || "#94a3b8"}
                    opacity={0.7 + 0.3 * Math.sin(pulsePhase * 0.06 + si)}
                    style={{ transition:"cx 0.1s, cy 0.1s" }}>
                    <title>{s.sense}: {s.label}</title>
                  </circle>
                );
              })}

              {/* AI impact overlay (visible on ai-impact tab) */}
              {activeTab === "ai-impact" && (() => {
                const tasks = (dept.knowledgeWork || []).filter(k => k.role === role.id);
                const scCount = tasks.filter(k => k.aiImpact === "shortcircuit").length;
                const suCount = tasks.filter(k => k.aiImpact === "supercharge").length;
                if (!scCount && !suCount) return null;
                return (
                  <g>
                    {scCount > 0 && <text x={role.x + s + 1} y={role.y - 1} fontSize="3.5" style={{ pointerEvents:"none" }}>🔁</text>}
                    {suCount > 0 && <text x={role.x + s + 1} y={role.y + 3} fontSize="3.5" style={{ pointerEvents:"none" }}>⚡</text>}
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>

      {/* Value flow legend (bottom of map) */}
      <div style={{ position:"absolute", bottom:8, left:12, right:12, display:"flex", gap:12, flexWrap:"wrap" }}>
        {Object.entries(VALUE_FLOW_LABELS).map(([k, v]) => (
          <div key={k} style={{ display:"flex", alignItems:"center", gap:4, fontSize:9, fontFamily:FONT.mono, color:VALUE_FLOW_COLORS[k], opacity:0.7 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:VALUE_FLOW_COLORS[k] }} />{v}
          </div>
        ))}
      </div>
    </div>
  );
}
