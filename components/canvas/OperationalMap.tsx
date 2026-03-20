"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Department, Role } from "../../types/department";
import { MAP, FONT, CLR, GRAY, RAD, TXT, SP, MOTION } from "../../styles/tokens";
import { VALUE_FLOW_COLORS, VALUE_FLOW_LABELS, SENSE_COLORS } from "../../data/constants";
import { IconButton } from "../ui/IconButton";

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
  onRolesUpdate?: (roles: Role[]) => void;
}

interface Camera { zoom: number; panX: number; panY: number; }
const RESET_CAMERA: Camera = { zoom: 1, panX: 0, panY: 0 };

export default function OperationalMap({
  dept, activeTab, selectedNode, setSelectedNode, selectedValueFlow,
  hoveredWorkflow, setHoveredWorkflow, pulsePhase, accentColor, onRolesUpdate,
}: OperationalMapProps) {

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Camera state
  const [camera, setCamera] = useState<Camera>(RESET_CAMERA);
  const cameraRef = useRef(camera);
  useEffect(() => { cameraRef.current = camera; }, [camera]);

  // Local role positions (overrides dept.roles positions via drag)
  const [localRoles, setLocalRoles] = useState<Role[]>(dept.roles || []);
  useEffect(() => {
    setLocalRoles(dept.roles || []);
    setCamera(RESET_CAMERA);
  }, [dept]);

  // Drag node state
  const dragRef = useRef<{ id: string; nodeX: number; nodeY: number; mouseX: number; mouseY: number; moved: boolean } | null>(null);

  // Pan state
  const panRef = useRef<{ startPanX: number; startPanY: number; mouseX: number; mouseY: number } | null>(null);

  // Inline label editing
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  // Convert client coords → SVG viewBox coords
  const toSvgCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    return pt.matrixTransform(m.inverse());
  }, []);

  // Convert SVG viewBox coords → world (content) coords
  const toWorldCoords = useCallback((svgX: number, svgY: number, cam: Camera) => ({
    x: (svgX - cam.panX) / cam.zoom,
    y: (svgY - cam.panY) / cam.zoom,
  }), []);

  // Wheel zoom (non-passive so we can preventDefault)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const svgPt = toSvgCoords(e.clientX, e.clientY);
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      setCamera(cam => {
        const newZoom = Math.max(0.4, Math.min(5, cam.zoom * factor));
        return {
          zoom: newZoom,
          panX: svgPt.x - (svgPt.x - cam.panX) * (newZoom / cam.zoom),
          panY: svgPt.y - (svgPt.y - cam.panY) * (newZoom / cam.zoom),
        };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [toSvgCoords]);

  // Global mouseup / mousemove (for drag and pan outside SVG)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const cam = cameraRef.current;
      const svgPt = toSvgCoords(e.clientX, e.clientY);

      if (panRef.current) {
        const { startPanX, startPanY, mouseX, mouseY } = panRef.current;
        const dx = svgPt.x - mouseX;
        const dy = svgPt.y - mouseY;
        setCamera(c => ({ ...c, panX: startPanX + dx, panY: startPanY + dy }));
      }

      if (dragRef.current) {
        const { id, nodeX, nodeY, mouseX, mouseY } = dragRef.current;
        const world = toWorldCoords(svgPt.x, svgPt.y, cam);
        const dx = world.x - mouseX;
        const dy = world.y - mouseY;
        if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) dragRef.current.moved = true;
        setLocalRoles(roles => roles.map(r => r.id === id ? {
          ...r,
          x: Math.max(8, Math.min(92, nodeX + dx)),
          y: Math.max(8, Math.min(88, nodeY + dy)),
        } : r));
      }
    };

    const onMouseUp = () => {
      if (dragRef.current?.moved) {
        setLocalRoles(roles => {
          onRolesUpdate?.(roles);
          return roles;
        });
      }
      dragRef.current = null;
      panRef.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [toSvgCoords, toWorldCoords, onRolesUpdate]);

  const getRoleById = (id: string) => localRoles.find(r => r.id === id);

  const getWorkflowPath = (wf: { from: string; to: string }) => {
    const f = getRoleById(wf.from), t = getRoleById(wf.to);
    if (!f || !t) return "";
    if (f.id === t.id) return `M ${f.x} ${f.y} Q ${f.x + 15} ${f.y - 15} ${f.x + 2} ${f.y - 6}`;
    const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2 - 8;
    return `M ${f.x} ${f.y} Q ${mx} ${my} ${t.x} ${t.y}`;
  };

  const hasSensors = (roleId: string) => (dept.sensors || []).some(s => s.role === roleId);
  const roleEffort = (roleId: string) => (dept.knowledgeWork || []).filter(k => k.role === roleId).reduce((s, k) => s + (k.effort || 0), 0);
  const maxEffort = Math.max(1, ...(localRoles).map(r => roleEffort(r.id)));

  const roleOpacity = (role: Role) => {
    if (activeTab === "sensors") return hasSensors(role.id) ? 1 : 0.25;
    if (activeTab === "value-flows" && selectedValueFlow) {
      return (dept.workflows || []).some(w => w.valueFlow === selectedValueFlow && (w.from === role.id || w.to === role.id)) ? 1 : 0.2;
    }
    if (selectedNode && selectedNode !== role.id) {
      return (dept.workflows || []).some(w => (w.from === selectedNode && w.to === role.id) || (w.to === selectedNode && w.from === role.id)) ? 0.8 : 0.2;
    }
    return 1;
  };

  const roleScale = (role: Role) => activeTab === "knowledge" ? 0.7 + 0.6 * (roleEffort(role.id) / maxEffort) : 1;

  const edgeOpacity = (wf: { from: string; to: string; valueFlow: string }) => {
    if (activeTab === "value-flows" && selectedValueFlow) return wf.valueFlow === selectedValueFlow ? 1 : 0.06;
    if (activeTab === "sensors") return 0.15;
    if (selectedNode) return (wf.from === selectedNode || wf.to === selectedNode) ? 1 : 0.08;
    return 1;
  };

  const senseColorMap: Record<string, string> = { sight: "#60a5fa", sound: "#a78bfa", smell: "#34d399", touch: "#fb923c", taste: "#f472b6" };
  const roleSensors = (roleId: string) => (dept.sensors || []).filter(s => s.role === roleId);
  const nodeSize = 6.5;

  // Commit label edit
  const commitEdit = (nodeId: string, label: string) => {
    const trimmed = label.trim();
    if (trimmed) {
      setLocalRoles(roles => {
        const updated = roles.map(r => r.id === nodeId ? { ...r, label: trimmed } : r);
        onRolesUpdate?.(updated);
        return updated;
      });
    }
    setEditingNodeId(null);
  };

  // Export SVG
  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const str = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([str], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dept.label.replace(/\s+/g, "-")}-map.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PNG (4× resolution)
  const exportPng = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const str = new XMLSerializer().serializeToString(svg);
    const scale = 4;
    const { width, height } = svg.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = MAP.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    const blob = new Blob([str], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `${dept.label.replace(/\s+/g, "-")}-map.png`;
      a.click();
    };
    img.src = url;
  };

  const zoomIn = () => setCamera(cam => {
    const newZoom = Math.min(5, cam.zoom * 1.25);
    return { zoom: newZoom, panX: 50 - (50 - cam.panX) * (newZoom / cam.zoom), panY: 46 - (46 - cam.panY) * (newZoom / cam.zoom) };
  });
  const zoomOut = () => setCamera(cam => {
    const newZoom = Math.max(0.4, cam.zoom / 1.25);
    return { zoom: newZoom, panX: 50 - (50 - cam.panX) * (newZoom / cam.zoom), panY: 46 - (46 - cam.panY) * (newZoom / cam.zoom) };
  });

  const zoomPct = Math.round(camera.zoom * 100);
  const isDefaultView = camera.zoom === 1 && camera.panX === 0 && camera.panY === 0;

  const toolbarBtnStyle: React.CSSProperties = {
    background: "rgba(15,18,25,0.75)", backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.1)", color: CLR.textOnDark,
    borderRadius: RAD.md, padding: `${SP.xs}px ${SP.sm}px`, cursor: "pointer",
    fontSize: TXT.xs, fontFamily: FONT.mono, fontWeight: 500,
    transition: `all ${MOTION.fast}`, lineHeight: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    minWidth: 28, height: 28,
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", background: MAP.bg, position: "relative", overflow: "hidden" }}
      role="img" aria-label={`Operational map for ${dept.label}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 100 92"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block", cursor: panRef.current ? "grabbing" : dragRef.current ? "grabbing" : "default" }}
        onMouseDown={e => {
          const tag = (e.target as Element).tagName;
          if (tag === "svg" || tag === "rect" && (e.target as Element).getAttribute("fill") === "url(#dotgrid)") {
            const svgPt = toSvgCoords(e.clientX, e.clientY);
            panRef.current = { startPanX: cameraRef.current.panX, startPanY: cameraRef.current.panY, mouseX: svgPt.x, mouseY: svgPt.y };
          }
        }}
        onDoubleClick={e => {
          const tag = (e.target as Element).tagName;
          if (tag === "svg" || (tag === "rect" && (e.target as Element).getAttribute("fill") === "url(#dotgrid)")) {
            setCamera(RESET_CAMERA);
          }
        }}
      >
        <defs>
          <pattern id="dotgrid" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="0.25" fill={MAP.grid} />
          </pattern>
          {Object.entries(VALUE_FLOW_COLORS).map(([k, c]) => (
            <marker key={k} id={`arr-${k}`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
              <path d="M0,0 L0,5 L5,2.5 z" fill={c} />
            </marker>
          ))}
          <marker id="arr-dim" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0 L0,5 L5,2.5 z" fill="#475569" />
          </marker>
          <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.4" />
          </filter>
          <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={accentColor} floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Fixed background */}
        <rect width="100" height="92" fill="url(#dotgrid)" />
        <radialGradient id="centerGlow" cx="50%" cy="45%" r="45%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.06" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
        <rect width="100" height="92" fill="url(#centerGlow)" />

        {/* Camera group */}
        <g transform={`translate(${camera.panX} ${camera.panY}) scale(${camera.zoom})`}>

          {/* Workflow edges */}
          {(dept.workflows || []).map((wf, idx) => {
            const isActive = hoveredWorkflow === wf.id || !!(selectedNode && (wf.from === selectedNode || wf.to === selectedNode));
            const vfc = VALUE_FLOW_COLORS[wf.valueFlow] || "#475569";
            const opacity = edgeOpacity(wf);
            const pid = `wfp-${wf.id}`;
            const dur = 2.2 + (idx % 4) * 0.35;
            const pCount = isActive ? 4 : 2;
            const f = getRoleById(wf.from), t = getRoleById(wf.to);
            if (!f || !t) return null;
            const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2 - 8;
            return (
              <g key={wf.id} style={{ opacity, transition: "opacity 0.4s" }}>
                <path d={getWorkflowPath(wf)} fill="none" stroke="transparent" strokeWidth={4} style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredWorkflow(wf.id)} onMouseLeave={() => setHoveredWorkflow(null)} />
                <path id={pid} d={getWorkflowPath(wf)} fill="none"
                  stroke={isActive ? vfc + "bb" : vfc + "55"} strokeWidth={isActive ? 0.7 : 0.35}
                  strokeDasharray={wf.valueFlow === "costSink" ? "2,1.5" : wf.valueFlow === "valueLeak" ? "1,1.5" : "none"}
                  markerEnd={isActive ? `url(#arr-${wf.valueFlow})` : "url(#arr-dim)"}
                  style={{ transition: "stroke 0.2s, stroke-width 0.2s" }} pointerEvents="none" />
                {Array.from({ length: pCount }).map((_, i) => (
                  <circle key={i} r={isActive && i === 0 ? 1 : 0.6} fill={vfc}
                    opacity={isActive ? (i === 0 ? 0.95 : 0.5) : 0.35} pointerEvents="none"
                    style={{ filter: isActive && i === 0 ? `drop-shadow(0 0 2px ${vfc})` : "none" }}>
                    <animateMotion dur={`${(dur * (0.9 + i * 0.07)).toFixed(2)}s`} repeatCount="indefinite" begin={`${-(i / pCount * dur).toFixed(2)}s`}>
                      <mpath href={`#${pid}`} />
                    </animateMotion>
                  </circle>
                ))}
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
          {localRoles.map(role => {
            const isSel = selectedNode === role.id;
            const isDraggingThis = dragRef.current?.id === role.id;
            const scale = roleScale(role);
            const opacity = roleOpacity(role);
            const s = nodeSize * scale;
            const senses = roleSensors(role.id);
            const isEditing = editingNodeId === role.id;

            return (
              <g key={role.id}
                style={{ opacity, transition: isDraggingThis ? "none" : "opacity 0.4s", cursor: isDraggingThis ? "grabbing" : "grab" }}
                onClick={e => {
                  if (dragRef.current?.moved) return;
                  setSelectedNode(isSel ? null : role.id);
                }}
                onMouseDown={e => {
                  e.stopPropagation();
                  const svgPt = toSvgCoords(e.clientX, e.clientY);
                  const world = toWorldCoords(svgPt.x, svgPt.y, cameraRef.current);
                  dragRef.current = { id: role.id, nodeX: role.x, nodeY: role.y, mouseX: world.x, mouseY: world.y, moved: false };
                }}
                onDoubleClick={e => {
                  e.stopPropagation();
                  setEditingNodeId(role.id);
                  setEditLabel(role.label);
                }}
              >
                <rect x={role.x - s} y={role.y - s} width={s * 2} height={s * 2} rx={MAP.nodeRadius * scale * 0.15}
                  fill={isSel ? accentColor + "30" : isDraggingThis ? MAP.nodeBg + "cc" : MAP.nodeBg}
                  stroke={isSel ? accentColor : isDraggingThis ? accentColor + "88" : MAP.nodeBorder}
                  strokeWidth={isSel || isDraggingThis ? 0.7 : 0.4}
                  filter={isSel ? "url(#nodeGlow)" : "url(#nodeShadow)"}
                  style={{ transition: isDraggingThis ? "none" : "all 0.3s" }} />
                <text x={role.x} y={role.y + 1.5} textAnchor="middle" fontSize={5.5 * scale} style={{ userSelect: "none", pointerEvents: "none" }}>{role.icon}</text>
                <rect x={role.x - 12} y={role.y + s + 1.5} width={24} height={5} rx={1.5} fill={MAP.labelBg} />
                {isEditing ? (
                  <foreignObject x={role.x - 13} y={role.y + s + 1} width={26} height={7}>
                    <input
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => {
                        e.stopPropagation();
                        if (e.key === "Enter") commitEdit(role.id, editLabel);
                        if (e.key === "Escape") setEditingNodeId(null);
                      }}
                      onBlur={() => commitEdit(role.id, editLabel)}
                      autoFocus
                      style={{ width: "100%", height: "100%", fontSize: "4px", fontFamily: FONT.mono, background: "#1e2235", border: `1px solid ${accentColor}`, borderRadius: "2px", textAlign: "center", padding: "1px 2px", color: "#e5e7eb", outline: "none", boxSizing: "border-box" }}
                    />
                  </foreignObject>
                ) : (
                  <text x={role.x} y={role.y + s + 5} textAnchor="middle" fill={isSel ? accentColor : CLR.textOnDark} fontSize="2.8" fontFamily={FONT.mono}
                    style={{ pointerEvents: "none", letterSpacing: "0.03em" }}>
                    {role.label.length > 18 ? role.label.slice(0, 17) + "\u2026" : role.label}
                  </text>
                )}

                {(activeTab === "sensors" || isSel) && senses.map((sens, si) => {
                  const angle = (si / Math.max(1, senses.length)) * Math.PI * 2 - Math.PI / 2;
                  const orbitR = nodeSize * scale + 3;
                  const sx = role.x + Math.cos(angle + pulsePhase * 0.02) * orbitR;
                  const sy = role.y + Math.sin(angle + pulsePhase * 0.02) * orbitR;
                  return (
                    <circle key={sens.id} cx={sx} cy={sy} r={1.2}
                      fill={senseColorMap[sens.sense] || "#94a3b8"}
                      opacity={0.7 + 0.3 * Math.sin(pulsePhase * 0.06 + si)}
                      style={{ transition: "cx 0.1s, cy 0.1s" }} pointerEvents="none">
                      <title>{sens.sense}: {sens.label}</title>
                    </circle>
                  );
                })}

                {activeTab === "ai-impact" && (() => {
                  const tasks = (dept.knowledgeWork || []).filter(k => k.role === role.id);
                  const scCount = tasks.filter(k => k.aiImpact === "shortcircuit").length;
                  const suCount = tasks.filter(k => k.aiImpact === "supercharge").length;
                  if (!scCount && !suCount) return null;
                  return (
                    <g>
                      {scCount > 0 && <text x={role.x + s + 1} y={role.y - 1} fontSize="3.5" style={{ pointerEvents: "none" }}>🔁</text>}
                      {suCount > 0 && <text x={role.x + s + 1} y={role.y + 3} fontSize="3.5" style={{ pointerEvents: "none" }}>⚡</text>}
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Toolbar overlay — top right */}
      <div style={{
        position: "absolute", top: SP.sm, right: SP.sm,
        display: "flex", flexDirection: "column", gap: 2, zIndex: 10,
      }}>
        {/* Zoom controls */}
        <div style={{
          display: "flex", flexDirection: "column",
          background: "rgba(15,18,25,0.75)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: RAD.md,
          overflow: "hidden",
        }}>
          <button onClick={zoomIn} title="Zoom in" aria-label="Zoom in"
            style={{ ...toolbarBtnStyle, background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.08)", borderRadius: 0 }}>
            +
          </button>
          <div style={{
            fontSize: 9, color: GRAY[400], textAlign: "center",
            padding: `2px ${SP.xs}px`, fontFamily: FONT.mono, minWidth: 28,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>
            {zoomPct}%
          </div>
          <button onClick={zoomOut} title="Zoom out" aria-label="Zoom out"
            style={{ ...toolbarBtnStyle, background: "transparent", border: "none", borderRadius: 0 }}>
            −
          </button>
        </div>

        {/* Reset + Export */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: SP.xs }}>
          <button onClick={() => setCamera(RESET_CAMERA)} title="Reset view" aria-label="Reset view"
            style={toolbarBtnStyle}>
            ⊡
          </button>
          <button onClick={exportSvg} title="Export SVG" aria-label="Export as SVG"
            style={toolbarBtnStyle}>
            SVG
          </button>
          <button onClick={exportPng} title="Export PNG (4×)" aria-label="Export as PNG"
            style={toolbarBtnStyle}>
            PNG
          </button>
        </div>
      </div>

      {/* Hint when zoom is default */}
      {isDefaultView && (
        <div style={{
          position: "absolute", bottom: SP.xxl, right: SP.sm,
          fontSize: TXT.xs, color: "rgba(255,255,255,0.25)", fontFamily: FONT.mono,
          pointerEvents: "none", textAlign: "right", lineHeight: 1.6,
        }}>
          scroll to zoom<br />drag to pan<br />drag nodes<br />dbl-click to edit
        </div>
      )}

      {/* Value flow legend */}
      <div style={{
        position: "absolute", bottom: SP.sm, left: SP.md, right: 100,
        display: "flex", gap: SP.md, flexWrap: "wrap",
      }}>
        {Object.entries(VALUE_FLOW_LABELS).map(([k, v]) => (
          <div key={k} style={{
            display: "flex", alignItems: "center", gap: SP.xs,
            fontSize: TXT.xs, fontFamily: FONT.mono, color: VALUE_FLOW_COLORS[k], opacity: 0.7,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: VALUE_FLOW_COLORS[k] }} />
            {v}
          </div>
        ))}
      </div>
    </div>
  );
}
