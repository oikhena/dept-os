"use client";

import { useState, useMemo } from "react";
import type { Department, Advisor } from "../../types/department";
import type { SavedDepartment } from "../../types/saved";
import type { User } from "@supabase/supabase-js";
import { TXT, SP, RAD, LS, FONT, SIDEBAR, CLR, GRAY, MOTION, SHADOW, T } from "../../styles/tokens";
import { useTheme } from "../../app/context/ThemeContext";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";

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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const KIND_INDICATOR: Record<string, { icon: string; color: string }> = {
  generated: { icon: "✦", color: "#22c55e" },
  custom: { icon: "✏", color: CLR.purple },
  workspace: { icon: "🔗", color: CLR.primary },
};

const THEME_ICONS: Record<string, { icon: string; label: string }> = {
  light: { icon: "☀", label: "Light" },
  system: { icon: "◐", label: "System" },
  dark: { icon: "☾", label: "Dark" },
};

export default function Sidebar({
  departments, savedDepts, selectedDept, onSelect,
  onGenerate, onBuildCustom, onCompare, onDelete,
  advisors, activeTab, onAdvisorClick,
  user, onLogout, collapsed = false, onToggleCollapse,
}: SidebarProps) {
  const [sections, setSections] = useState<Record<string, boolean>>({ templates: false, saved: false });
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const toggleSection = (key: string) => setSections(s => ({ ...s, [key]: !s[key] }));

  const searchLower = search.toLowerCase();
  const filteredBuiltIn = useMemo(() =>
    Object.entries(departments).filter(([, d]) => !search || d.label.toLowerCase().includes(searchLower)),
    [departments, searchLower, search]
  );
  const filteredSaved = useMemo(() =>
    savedDepts.filter(s => !search || s.department.label.toLowerCase().includes(searchLower)),
    [savedDepts, searchLower, search]
  );

  // Collapsed rail view
  if (collapsed) {
    return (
      <nav
        role="navigation"
        aria-label="Department navigation"
        style={{
          width: SIDEBAR.collapsedWidth, background: T.bgSecondary,
          borderRight: `1px solid ${T.borderDefault}`,
          display: "flex", flexDirection: "column", alignItems: "center",
          flexShrink: 0, height: "100vh", overflow: "hidden",
          padding: "12px 0",
        }}
      >
        <IconButton label="Expand sidebar" onClick={onToggleCollapse} size={36} variant="ghost">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </IconButton>

        <div style={{ width: 20, height: 1, background: T.borderDefault, margin: "8px 0" }} />

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "4px 0" }}>
          {Object.entries(departments).map(([key, d]) => (
            <IconButton key={key} label={d.label} onClick={() => onSelect(key)} size={36} variant="ghost"
              style={{
                background: selectedDept === key ? T.bgActive : undefined,
                borderLeft: selectedDept === key ? `2px solid ${d.color || CLR.primary}` : "2px solid transparent",
                borderRadius: 0,
              }}>
              <span style={{ fontSize: 16 }}>{d.icon}</span>
            </IconButton>
          ))}
          {savedDepts.map(s => (
            <IconButton key={s.id} label={s.department.label} onClick={() => onSelect(s.id)} size={36} variant="ghost"
              style={{
                background: selectedDept === s.id ? T.bgActive : undefined,
                borderLeft: selectedDept === s.id ? `2px solid ${s.department.color || CLR.primary}` : "2px solid transparent",
                borderRadius: 0,
              }}>
              <span style={{ fontSize: 16 }}>{s.department.icon}</span>
            </IconButton>
          ))}
        </div>

        <IconButton label="Generate new department" onClick={onGenerate} size={36} variant="ghost"
          style={{ color: CLR.success }}>
          <span style={{ fontSize: 16 }}>+</span>
        </IconButton>
      </nav>
    );
  }

  const sectionHeaderStyle = {
    display: "flex" as const, alignItems: "center" as const, gap: 6,
    width: "100%", background: "transparent", border: "none",
    padding: "6px 16px", cursor: "pointer" as const,
    fontFamily: FONT.sans, fontSize: TXT.xs, fontWeight: 600 as const,
    color: T.textMuted, letterSpacing: LS.wide, textAlign: "left" as const,
  };

  const itemStyle = (isActive: boolean, color: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 16px 8px 14px",
    borderLeft: isActive ? `3px solid ${color}` : "3px solid transparent",
    background: isActive ? T.bgActive : "transparent",
    cursor: "pointer", transition: `all ${MOTION.fast} ${MOTION.ease}`,
    fontSize: TXT.md, fontFamily: FONT.sans,
    color: isActive ? T.textPrimary : T.textSecondary,
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <nav
      role="navigation"
      aria-label="Department navigation"
      style={{
        width: SIDEBAR.width, background: T.bgSecondary,
        borderRight: `1px solid ${T.borderDefault}`,
        display: "flex", flexDirection: "column",
        flexShrink: 0, height: "100vh", overflow: "hidden",
        transition: `width ${MOTION.normal} ${MOTION.ease}`,
      }}
    >
      {/* Logo + Collapse */}
      <div style={{
        padding: "14px 16px 12px",
        borderBottom: `1px solid ${T.borderDefault}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 9, height: 9, borderRadius: "50%",
              background: CLR.success,
              boxShadow: `0 0 8px ${CLR.success}60`,
            }} />
            <span style={{
              fontFamily: FONT.sans, fontWeight: 700, fontSize: TXT.lg,
              color: T.textPrimary, letterSpacing: "0.02em",
            }}>DEPT.OS</span>
          </div>
          <div style={{
            fontFamily: FONT.sans, fontSize: TXT.xs, color: T.textMuted,
            marginTop: 3, letterSpacing: LS.wide,
          }}>INSTITUTIONAL INTELLIGENCE</div>
        </div>
        {onToggleCollapse && (
          <IconButton label="Collapse sidebar" onClick={onToggleCollapse} size={28} variant="ghost">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </IconButton>
        )}
      </div>

      {/* Search */}
      <div style={{ padding: "10px 12px 6px" }}>
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
            fontSize: TXT.sm, color: T.textMuted, pointerEvents: "none",
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/><path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search departments..."
            aria-label="Search departments"
            style={{
              width: "100%", padding: "7px 10px 7px 32px",
              background: T.bgSurface, border: `1px solid ${T.borderDefault}`,
              borderRadius: RAD.md, fontSize: TXT.sm, fontFamily: FONT.sans,
              color: T.textPrimary, outline: "none",
              transition: `border-color ${MOTION.fast}`,
              boxSizing: "border-box",
            }}
            onFocus={e => e.currentTarget.style.borderColor = CLR.primary}
            onBlur={e => e.currentTarget.style.borderColor = ""}
          />
          {search && (
            <IconButton label="Clear search" onClick={() => setSearch("")} size={20} variant="ghost"
              style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", fontSize: 10 }}>
              ✕
            </IconButton>
          )}
        </div>
      </div>

      {/* Advisors — PROMOTED TO TOP */}
      {advisors.length > 0 && (
        <div style={{ padding: "6px 12px 10px", borderBottom: `1px solid ${T.borderDefault}` }}>
          <div style={{
            fontFamily: FONT.sans, fontSize: TXT.xs, fontWeight: 600,
            color: T.textMuted, letterSpacing: LS.wide, marginBottom: 6,
          }}>ADVISORS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {advisors.map((a, i) => (
              <button key={i} onClick={() => onAdvisorClick(a)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: a.color + "08", border: `1px solid ${a.color}20`,
                  borderRadius: RAD.md, padding: "6px 10px",
                  cursor: "pointer", fontFamily: FONT.sans,
                  fontSize: TXT.sm, color: a.color, textAlign: "left",
                  transition: `all ${MOTION.fast} ${MOTION.ease}`,
                  width: "100%",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = a.color + "14";
                  e.currentTarget.style.borderColor = a.color + "40";
                  e.currentTarget.style.boxShadow = `0 1px 3px ${a.color}15`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = a.color + "08";
                  e.currentTarget.style.borderColor = a.color + "20";
                  e.currentTarget.style.boxShadow = "none";
                }}>
                <span style={{ fontSize: 14 }}>{a.icon}</span>
                <span style={{ fontWeight: 500 }}>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Department list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {/* Templates */}
        <div style={{ marginBottom: 4 }}>
          <button onClick={() => toggleSection("templates")} style={sectionHeaderStyle}>
            <span style={{
              fontSize: 9, transform: sections.templates ? "rotate(-90deg)" : "rotate(0deg)",
              transition: `transform ${MOTION.fast}`, display: "inline-block",
            }}>▼</span>
            TEMPLATES
            <span style={{ marginLeft: "auto", fontSize: TXT.xs, color: T.textMuted }}>{filteredBuiltIn.length}</span>
          </button>
          {!sections.templates && filteredBuiltIn.map(([key, d]) => (
            <div key={key}
              role="button"
              aria-pressed={selectedDept === key}
              tabIndex={0}
              onClick={() => onSelect(key)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(key); } }}
              style={itemStyle(selectedDept === key, d.color || CLR.primary)}
              onMouseEnter={e => { if (selectedDept !== key) e.currentTarget.style.background = T.bgHover; }}
              onMouseLeave={e => { if (selectedDept !== key) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: 17 }}>{d.icon}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>
            </div>
          ))}
        </div>

        {/* Saved departments */}
        {savedDepts.length > 0 && (
          <div style={{ marginBottom: 4 }}>
            <button onClick={() => toggleSection("saved")} style={sectionHeaderStyle}>
              <span style={{
                fontSize: 9, transform: sections.saved ? "rotate(-90deg)" : "rotate(0deg)",
                transition: `transform ${MOTION.fast}`, display: "inline-block",
              }}>▼</span>
              YOUR DEPARTMENTS
              <span style={{ marginLeft: "auto", fontSize: TXT.xs, color: T.textMuted }}>{filteredSaved.length}</span>
            </button>
            {!sections.saved && filteredSaved.map(s => {
              const kind = KIND_INDICATOR[s.kind] || KIND_INDICATOR.custom;
              return (
                <div key={s.id}
                  role="button"
                  aria-pressed={selectedDept === s.id}
                  tabIndex={0}
                  onClick={() => onSelect(s.id)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(s.id); } }}
                  style={{ ...itemStyle(selectedDept === s.id, s.department.color || CLR.primary), position: "relative" }}
                  onMouseEnter={e => { if (selectedDept !== s.id) e.currentTarget.style.background = T.bgHover; }}
                  onMouseLeave={e => { if (selectedDept !== s.id) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ fontSize: 17 }}>{s.department.icon}</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.department.label}</span>
                  <span style={{ fontSize: TXT.xs, color: kind.color }}>{kind.icon}</span>

                  {/* Delete with confirmation */}
                  {confirmDelete === s.id ? (
                    <div style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      display: "flex", gap: 4, background: T.bgSecondary,
                      padding: "2px 4px", borderRadius: RAD.sm,
                      boxShadow: T.shadowMd, zIndex: 10,
                    }} onClick={e => e.stopPropagation()}>
                      <IconButton label={`Confirm delete ${s.department.label}`} onClick={e => { e.stopPropagation(); onDelete(s.id); setConfirmDelete(null); }} size={24} variant="danger">
                        ✓
                      </IconButton>
                      <IconButton label="Cancel delete" onClick={e => { e.stopPropagation(); setConfirmDelete(null); }} size={24} variant="ghost">
                        ✕
                      </IconButton>
                    </div>
                  ) : (
                    <IconButton
                      label={`Delete ${s.department.label}`}
                      onClick={e => { e.stopPropagation(); setConfirmDelete(s.id); }}
                      size={24} variant="ghost"
                      style={{ opacity: 0.4, fontSize: TXT.xs }}
                    >
                      ✕
                    </IconButton>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Encouragement when authenticated but no saved depts */}
        {user && savedDepts.length === 0 && !search && (
          <div style={{ padding: "8px 12px" }}>
            <div style={{
              background: `${CLR.success}08`, border: `1px dashed ${CLR.success}30`,
              borderRadius: RAD.lg, padding: "12px 14px", textAlign: "center",
            }}>
              <div style={{ fontSize: TXT.xs, fontWeight: 600, color: T.textMuted, letterSpacing: LS.wide, marginBottom: 6 }}>YOUR DEPARTMENTS</div>
              <div style={{ fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans, lineHeight: 1.5, marginBottom: 10 }}>
                Generate your first department to start mapping workflows and agents.
              </div>
              <Button variant="success" size="sm" onClick={onGenerate} style={{ width: "100%" }}>
                + Generate First Dept
              </Button>
            </div>
          </div>
        )}

        {/* Search no results */}
        {search && filteredBuiltIn.length === 0 && filteredSaved.length === 0 && (
          <div style={{
            padding: "20px 16px", textAlign: "center",
            fontSize: TXT.sm, color: T.textMuted, fontFamily: FONT.sans,
          }}>
            No departments match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{
        borderTop: `1px solid ${T.borderDefault}`,
        padding: "10px 12px",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <Button variant="success" size="md" onClick={onGenerate}
          style={{
            width: "100%", background: `${CLR.success}10`,
            border: `1px solid ${CLR.success}30`, color: CLR.success,
          }}>
          + Generate New
        </Button>
        <div style={{ display: "flex", gap: 6 }}>
          <Button variant="secondary" size="sm" onClick={onBuildCustom} style={{ flex: 1 }}>
            Build
          </Button>
          <Button variant="secondary" size="sm" onClick={onCompare} style={{ flex: 1 }}>
            Compare
          </Button>
        </div>
      </div>

      {/* Theme toggle */}
      <div style={{
        borderTop: `1px solid ${T.borderDefault}`,
        padding: "6px 12px",
        display: "flex", justifyContent: "center", gap: 2,
      }}>
        {(["light", "system", "dark"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setTheme(mode)}
            aria-label={`${THEME_ICONS[mode].label} theme`}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              padding: "5px 0",
              background: theme === mode ? T.bgActive : "transparent",
              border: `1px solid ${theme === mode ? T.borderDefault : "transparent"}`,
              borderRadius: RAD.md, cursor: "pointer",
              fontSize: TXT.xs, fontFamily: FONT.sans,
              color: theme === mode ? T.textPrimary : T.textMuted,
              fontWeight: theme === mode ? 600 : 400,
              transition: `all ${MOTION.fast}`,
            }}
          >
            <span style={{ fontSize: 12 }}>{THEME_ICONS[mode].icon}</span>
            <span>{THEME_ICONS[mode].label}</span>
          </button>
        ))}
      </div>

      {/* Auth */}
      <div style={{ borderTop: `1px solid ${T.borderDefault}`, padding: "10px 12px" }}>
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: RAD.full,
              background: CLR.primary + "15", border: `1px solid ${CLR.primary}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: TXT.sm, fontWeight: 600, color: CLR.primary, fontFamily: FONT.sans,
              flexShrink: 0,
            }}>
              {(user.email || "?")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{
                fontSize: TXT.sm, color: T.textSecondary, fontFamily: FONT.sans,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{user.email}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={onLogout}
              style={{ fontSize: TXT.xs, padding: "0 8px", height: 26 }}>
              Sign out
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <a href="/login" style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              background: CLR.primary + "10", border: `1px solid ${CLR.primary}30`,
              color: CLR.primary, padding: "7px", borderRadius: RAD.md, cursor: "pointer",
              fontFamily: FONT.sans, fontSize: TXT.sm, fontWeight: 600,
              textDecoration: "none", transition: `all ${MOTION.fast}`,
              boxSizing: "border-box",
            }}>
              Sign in
            </a>
            <a href="/signup" style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: `1px solid ${T.borderDefault}`,
              color: T.textSecondary, padding: "7px", borderRadius: RAD.md, cursor: "pointer",
              fontFamily: FONT.sans, fontSize: TXT.sm, fontWeight: 500,
              textDecoration: "none", transition: `all ${MOTION.fast}`,
              boxSizing: "border-box",
            }}>
              Sign up
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
