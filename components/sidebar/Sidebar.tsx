"use client";

import { useState } from "react";
import type { Department, Advisor } from "../../types/department";
import type { SavedDepartment } from "../../types/saved";
import type { User } from "@supabase/supabase-js";
import { TXT, SP, RAD, LS, FONT, SIDEBAR, CLR } from "../../styles/tokens";

interface SidebarProps {
  departments: Record<string, Department>;
  savedDepts: SavedDepartment[];
  selectedDept: string;
  onSelect: (key: string) => void;
  onGenerate: () => void;
  onBuildCustom: () => void;
  onCompare: () => void;
  onDelete: (id: string) => void;
  advisors: Advisor[];
  activeTab: string;
  onAdvisorClick: (advisor: Advisor) => void;
  user: User | null;
  onLogout: () => void;
}

export default function Sidebar({ departments, savedDepts, selectedDept, onSelect, onGenerate, onBuildCustom, onCompare, onDelete, advisors, activeTab, onAdvisorClick, user, onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ builtin: false, saved: false });
  const toggle = (key: string) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  const generatedDepts = savedDepts.filter(s => s.kind === "generated");
  const customDepts = savedDepts.filter(s => s.kind === "custom");

  const itemStyle = (isActive: boolean, color: string) => ({
    display:"flex" as const, alignItems:"center" as const, gap:10, padding:"7px 14px 7px 11px",
    borderLeft: isActive ? `3px solid ${color}` : "3px solid transparent",
    background: isActive ? SIDEBAR.activeBg : "transparent",
    cursor:"pointer" as const, transition:"all 0.12s", fontSize:13, fontFamily:FONT.sans,
    color: isActive ? CLR.textPrimary : CLR.textSecondary,
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <div style={{ width:SIDEBAR.width, background:SIDEBAR.bg, borderRight:`1px solid ${SIDEBAR.border}`, display:"flex", flexDirection:"column", flexShrink:0, height:"100vh", overflow:"hidden" }}>
      {/* Logo */}
      <div style={{ padding:"14px 16px 10px", borderBottom:`1px solid ${SIDEBAR.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 8px #22c55e60" }} />
          <span style={{ fontFamily:FONT.sans, fontWeight:700, fontSize:15, color:CLR.textPrimary, letterSpacing:"0.02em" }}>DEPT.OS</span>
        </div>
        <div style={{ fontFamily:FONT.sans, fontSize:10, color:CLR.textMuted, marginTop:3, letterSpacing:LS.wide }}>INSTITUTIONAL INTELLIGENCE</div>
      </div>

      {/* Department groups */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
        {/* Built-in */}
        <div style={{ marginBottom:4 }}>
          <button onClick={() => toggle("builtin")} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", background:"transparent", border:"none", padding:"4px 16px", cursor:"pointer", fontFamily:FONT.sans, fontSize:10, fontWeight:600, color:CLR.textMuted, letterSpacing:LS.wide, textAlign:"left" }}>
            <span style={{ fontSize:8, transform:collapsed.builtin?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.15s", display:"inline-block" }}>▼</span>
            BUILT-IN
            <span style={{ marginLeft:"auto", fontSize:9, color:CLR.textMuted }}>{Object.keys(departments).length}</span>
          </button>
          {!collapsed.builtin && Object.entries(departments).map(([key, d]) => (
            <div key={key} onClick={() => onSelect(key)}
              style={itemStyle(selectedDept === key, d.color || "#00b4d8")}
              onMouseEnter={e => { if (selectedDept !== key) (e.currentTarget as HTMLElement).style.background = SIDEBAR.hoverBg; }}
              onMouseLeave={e => { if (selectedDept !== key) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <span style={{ fontSize:16 }}>{d.icon}</span>
              <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.label}</span>
            </div>
          ))}
        </div>

        {/* Saved departments */}
        {savedDepts.length > 0 && (
          <div style={{ marginBottom:4 }}>
            <button onClick={() => toggle("saved")} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", background:"transparent", border:"none", padding:"4px 16px", cursor:"pointer", fontFamily:FONT.sans, fontSize:10, fontWeight:600, color:CLR.textMuted, letterSpacing:LS.wide, textAlign:"left" }}>
              <span style={{ fontSize:8, transform:collapsed.saved?"rotate(-90deg)":"rotate(0deg)", transition:"transform 0.15s", display:"inline-block" }}>▼</span>
              YOUR DEPARTMENTS
              <span style={{ marginLeft:"auto", fontSize:9, color:CLR.textMuted }}>{savedDepts.length}</span>
            </button>
            {!collapsed.saved && savedDepts.map(s => (
              <div key={s.id} onClick={() => onSelect(s.id)}
                style={{ ...itemStyle(selectedDept === s.id, s.department.color || "#00b4d8"), position:"relative" as const }}
                onMouseEnter={e => { if (selectedDept !== s.id) (e.currentTarget as HTMLElement).style.background = SIDEBAR.hoverBg; }}
                onMouseLeave={e => { if (selectedDept !== s.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <span style={{ fontSize:16 }}>{s.department.icon}</span>
                <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.department.label}</span>
                {s.kind === "generated" && <span style={{ fontSize:10, color:"#22c55e" }}>✦</span>}
                <button
                  onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                  style={{ background:"transparent", border:"none", color:CLR.textMuted, cursor:"pointer", fontSize:10, padding:"0 2px", opacity:0.5, transition:"opacity 0.12s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.5"; }}
                  title="Delete">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advisors */}
      {advisors.length > 0 && (
        <div style={{ borderTop:`1px solid ${SIDEBAR.border}`, padding:"10px 12px" }}>
          <div style={{ fontFamily:FONT.sans, fontSize:10, fontWeight:600, color:CLR.textMuted, letterSpacing:LS.wide, marginBottom:6 }}>ADVISORS</div>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {advisors.map((a, i) => (
              <button key={i} onClick={() => onAdvisorClick(a)}
                style={{ display:"flex", alignItems:"center", gap:7, background:"transparent", border:`1px solid ${a.color}20`, borderRadius:RAD.sm, padding:"4px 8px", cursor:"pointer", fontFamily:FONT.sans, fontSize:11, color:a.color, textAlign:"left", transition:"all 0.12s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = a.color + "0a"; (e.currentTarget as HTMLElement).style.borderColor = a.color + "40"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = a.color + "20"; }}>
                <span>{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ borderTop:`1px solid ${SIDEBAR.border}`, padding:"10px 12px", display:"flex", flexDirection:"column", gap:5 }}>
        <button onClick={onGenerate}
          style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", background:"#22c55e0c", border:"1px solid #22c55e30", color:"#22c55e", padding:"7px", borderRadius:RAD.md, cursor:"pointer", fontFamily:FONT.sans, fontSize:11, fontWeight:600, letterSpacing:LS.normal, transition:"all 0.12s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#22c55e18"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#22c55e0c"; }}>
          ⟳ Generate New...
        </button>
        <button onClick={onBuildCustom}
          style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", background:"transparent", border:`1px solid ${SIDEBAR.border}`, color:CLR.textSecondary, padding:"7px", borderRadius:RAD.md, cursor:"pointer", fontFamily:FONT.sans, fontSize:11, fontWeight:500, letterSpacing:LS.normal, transition:"all 0.12s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = SIDEBAR.hoverBg; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
          ✦ Build Custom...
        </button>
        <button onClick={onCompare}
          style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", background:"transparent", border:`1px solid ${SIDEBAR.border}`, color:CLR.textSecondary, padding:"7px", borderRadius:RAD.md, cursor:"pointer", fontFamily:FONT.sans, fontSize:11, fontWeight:500, letterSpacing:LS.normal, transition:"all 0.12s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = SIDEBAR.hoverBg; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
          ⇄ Compare...
        </button>
      </div>

      {/* Auth */}
      <div style={{ borderTop:`1px solid ${SIDEBAR.border}`, padding:"8px 12px" }}>
        {user ? (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ flex:1, overflow:"hidden" }}>
              <div style={{ fontSize:11, color:CLR.textSecondary, fontFamily:FONT.sans, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</div>
            </div>
            <button onClick={onLogout}
              style={{ background:"transparent", border:`1px solid ${SIDEBAR.border}`, color:CLR.textMuted, padding:"3px 8px", borderRadius:RAD.sm, cursor:"pointer", fontSize:10, fontFamily:FONT.sans, transition:"all 0.12s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = CLR.textSecondary; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = CLR.textMuted; }}>
              Log out
            </button>
          </div>
        ) : (
          <a href="/login" style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:6, width:"100%", background:"transparent", border:`1px solid ${SIDEBAR.border}`, color:CLR.textSecondary, padding:"7px", borderRadius:RAD.md, cursor:"pointer", fontFamily:FONT.sans, fontSize:11, fontWeight:500, letterSpacing:LS.normal, textDecoration:"none", transition:"all 0.12s", boxSizing:"border-box" }}>
            Sign in to save work
          </a>
        )}
      </div>
    </div>
  );
}
