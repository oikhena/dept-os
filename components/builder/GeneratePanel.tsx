"use client";

import { useState, useEffect, useRef } from "react";
import type { Department } from "../../types/department";
import { TXT, SP, RAD, LS, LH, FONT, CLR, GRAY, MOTION, SHADOW, T } from "../../styles/tokens";
import { AGENT_TYPES, EXAMPLE_QUERIES } from "../../data/constants";
import { generateDepartment, tryParse } from "../../lib/ai/streaming";
import { Button } from "../ui/Button";
import PlacesAutocomplete from "../maps/PlacesAutocomplete";
import type { PlaceDetails } from "../../lib/maps/loader";

interface GeneratePanelProps {
  onGenerated: (dept: Department, query: string) => void;
}

export default function GeneratePanel({ onGenerated }: GeneratePanelProps) {
  const [query, setQuery] = useState("");
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [phase, setPhase] = useState<"idle" | "researching" | "error">("idle");
  const [rawStream, setRawStream] = useState("");
  const [partial, setPartial] = useState<Department | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let f = 0;
    const t = setInterval(() => { f = (f + 1) % 360; setPulse(f); }, 50);
    return () => clearInterval(t);
  }, []);

  const generate = async () => {
    if (!query.trim() || phase === "researching") return;
    setPhase("researching"); setRawStream(""); setPartial(null); setParseError(null); setElapsed(0); setShowRaw(false);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    abortRef.current = new AbortController();
    let acc = "";
    try {
      const result = await generateDepartment(query, placeDetails, chunk => {
        acc += chunk; setRawStream(acc);
        const p = tryParse(acc);
        if (p?.label) setPartial(p);
      }, abortRef.current.signal);
      const final = tryParse(acc);
      if (final?.label) {
        if (placeDetails && final) {
          final.coordinates = { lat: placeDetails.lat, lng: placeDetails.lng };
        }
        // Merge server-side citations if the model didn't include them
        if (result.citations.length > 0 && !final._citations?.length) {
          final._citations = result.citations;
        }
        clearInterval(timerRef.current!);
        onGenerated(final, query);
      } else { setParseError("Could not parse response. Try again."); setPhase("error"); }
    } catch (err: any) {
      clearInterval(timerRef.current!);
      if (err.name !== "AbortError") { setParseError(err.message); setPhase("error"); }
      else setPhase("idle");
    }
  };

  const fields = [
    { key: "label", l: "Identity", icon: "🏷️" },
    { key: "summary", l: "Summary", icon: "📝" },
    { key: "roles", l: "Roles", icon: "👤" },
    { key: "workflows", l: "Workflows", icon: "⟶" },
    { key: "sensors", l: "Sensors", icon: "📡" },
    { key: "knowledgeWork", l: "Tasks", icon: "📋" },
    { key: "agents", l: "Agents", icon: "🤖" },
  ];

  const completedCount = fields.filter(f => {
    const found = rawStream.includes(`"${f.key}"`);
    return found && rawStream.indexOf(`"${f.key}"`) < rawStream.length - 20;
  }).length;

  return (
    <div style={{ padding: `${SP.xxl}px ${SP.xxl}px`, height: "100%", display: "flex", gap: SP.xxl, overflow: "hidden", fontFamily: FONT.sans }}>
      {/* Left col — input + progress */}
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", gap: SP.xl }}>
        <div>
          <div style={{ fontSize: TXT.xs, color: GRAY[500], letterSpacing: LS.wide, fontWeight: 600, marginBottom: SP.sm, textTransform: "uppercase" }}>
            Research any institution
          </div>
          <PlacesAutocomplete
            value={query}
            onChange={setQuery}
            onPlaceSelect={details => {
              setPlaceDetails(details);
              if (details) setQuery(details.name);
            }}
            placeholder="e.g. 'Lagos State Ministry of Health'"
            disabled={phase === "researching"}
            style={{
              border: `1px solid ${phase === "researching" ? CLR.success + "60" : T.borderDefault}`,
              transition: `border-color ${MOTION.fast}`,
            }}
          />
          {placeDetails && (
            <div style={{ fontSize: TXT.sm, color: CLR.success, marginTop: SP.xs, display: "flex", alignItems: "center", gap: SP.xs }}>
              <span>📍</span>
              <span style={{ color: GRAY[500] }}>{placeDetails.address}</span>
            </div>
          )}
          <div style={{ display: "flex", gap: SP.sm, marginTop: SP.md }}>
            {phase === "researching" ? (
              <Button variant="danger" size="md" style={{ flex: 1 }}
                onClick={() => { abortRef.current?.abort(); clearInterval(timerRef.current!); setPhase("idle"); }}>
                Cancel
              </Button>
            ) : (
              <Button variant="success" size="md" style={{ flex: 1 }}
                onClick={generate}
                disabled={!query.trim()}>
                Research + Generate
              </Button>
            )}
          </div>
        </div>

        {/* Examples — idle state */}
        {phase === "idle" && (
          <div>
            <div style={{ fontSize: TXT.xs, color: GRAY[400], letterSpacing: LS.wide, fontWeight: 600, marginBottom: SP.sm, textTransform: "uppercase" }}>
              Try these
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: SP.xs }}>
              {EXAMPLE_QUERIES.map(q => (
                <button key={q} onClick={() => { setQuery(q); setPlaceDetails(null); }}
                  style={{
                    background: "transparent", border: `1px solid ${T.borderDefault}`, color: T.textMuted,
                    padding: `${SP.xs}px ${SP.sm}px`, borderRadius: RAD.md, cursor: "pointer",
                    fontSize: TXT.sm, fontFamily: FONT.sans, textAlign: "left",
                    transition: `all ${MOTION.fast}`, lineHeight: LH.normal,
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.color = T.textSecondary; (e.currentTarget).style.borderColor = GRAY[300]; (e.currentTarget).style.background = T.bgSecondary; }}
                  onMouseLeave={e => { (e.currentTarget).style.color = T.textMuted; (e.currentTarget).style.borderColor = T.borderDefault; (e.currentTarget).style.background = "transparent"; }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress — researching state */}
        {phase === "researching" && (
          <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
            {/* Timer + progress bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP.sm }}>
                <span style={{ fontSize: TXT.sm, color: CLR.success, fontWeight: 600, fontFamily: FONT.mono }}>{elapsed}s</span>
                <span style={{ fontSize: TXT.xs, color: GRAY[400] }}>{completedCount}/{fields.length} fields</span>
              </div>
              <div style={{ height: 3, background: GRAY[200], borderRadius: RAD.full, overflow: "hidden" }}>
                <div style={{
                  height: "100%", background: CLR.success, borderRadius: RAD.full,
                  width: `${(completedCount / fields.length) * 100}%`,
                  transition: `width ${MOTION.normal}`,
                }} />
              </div>
            </div>

            {/* Field checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {fields.map(f => {
                const found = rawStream.includes(`"${f.key}"`);
                const done = found && rawStream.indexOf(`"${f.key}"`) < rawStream.length - 20;
                return (
                  <div key={f.key} style={{ display: "flex", alignItems: "center", gap: SP.sm, transition: `opacity ${MOTION.fast}` }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: RAD.sm, display: "flex", alignItems: "center", justifyContent: "center",
                      background: done ? CLR.success + "18" : found ? CLR.warning + "18" : GRAY[100],
                      border: `1px solid ${done ? CLR.success + "40" : found ? CLR.warning + "40" : GRAY[200]}`,
                      fontSize: 10, transition: `all ${MOTION.normal}`,
                    }}>
                      {done ? "✓" : f.icon}
                    </div>
                    <span style={{ fontSize: TXT.sm, color: done ? CLR.success : found ? CLR.warning : GRAY[400], fontWeight: done ? 600 : 400, transition: `color ${MOTION.normal}` }}>
                      {f.l}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Partial preview card */}
            {partial?.label && (
              <div style={{
                background: T.bgSecondary, border: `1px solid ${T.borderDefault}`,
                borderRadius: RAD.lg, padding: SP.lg,
                animation: "fadeIn 0.3s ease",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.sm }}>
                  <span style={{ fontSize: TXT.xl }}>{partial.icon}</span>
                  <div>
                    <div style={{ fontSize: TXT.md, color: partial.color || CLR.success, fontWeight: 700 }}>{partial.label}</div>
                    {partial.region && <div style={{ fontSize: TXT.xs, color: GRAY[500] }}>{partial.region}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap" }}>
                  {[
                    { label: "Roles", count: partial.roles?.length || 0, color: T.textPrimary },
                    { label: "Flows", count: partial.workflows?.length || 0, color: CLR.info },
                    { label: "Sensors", count: partial.sensors?.length || 0, color: CLR.purple },
                    { label: "Agents", count: partial.agents?.length || 0, color: CLR.warning },
                  ].map(s => (
                    <div key={s.label} style={{ fontSize: TXT.xs, color: s.color, fontWeight: 600 }}>
                      {s.count} {s.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw stream toggle */}
            <button onClick={() => setShowRaw(!showRaw)}
              style={{
                background: "transparent", border: "none", color: GRAY[400],
                fontSize: TXT.xs, cursor: "pointer", fontFamily: FONT.mono,
                textAlign: "left", padding: 0,
              }}>
              {showRaw ? "▾ Hide raw stream" : "▸ Show raw stream"}
            </button>
          </div>
        )}

        {/* Error state */}
        {phase === "error" && (
          <div style={{
            background: CLR.danger + "08", border: `1px solid ${CLR.danger}30`,
            borderRadius: RAD.lg, padding: SP.lg,
          }}>
            <div style={{ color: CLR.danger, fontSize: TXT.md, fontWeight: 600, marginBottom: SP.xs }}>Generation failed</div>
            <div style={{ fontSize: TXT.sm, color: GRAY[500], lineHeight: LH.relaxed }}>{parseError}</div>
            <Button variant="danger" size="sm" style={{ marginTop: SP.md }}
              onClick={() => { setPhase("idle"); setParseError(null); }}>
              Try again
            </Button>
          </div>
        )}
      </div>

      {/* Right col — agent types (idle) or raw stream (researching) */}
      {phase === "idle" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: SP.xl }}>
          <div style={{ textAlign: "center", maxWidth: 460 }}>
            <div style={{ fontSize: TXT.xl, fontWeight: 700, color: T.textPrimary, marginBottom: SP.sm }}>
              AI-powered institutional analysis
            </div>
            <div style={{ fontSize: TXT.md, color: GRAY[500], lineHeight: LH.relaxed }}>
              Describe any institution and we'll generate a complete operational model with roles, workflows, sensors, tasks, and agent architecture.
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.md, maxWidth: 460, width: "100%" }}>
            {Object.entries(AGENT_TYPES).map(([type, at]) => (
              <div key={type} style={{
                background: T.bgSecondary, border: `1px solid ${at.color}20`,
                borderRadius: RAD.lg, padding: `${SP.lg}px ${SP.lg}px`,
                transition: `border-color ${MOTION.fast}`,
              }}>
                <div style={{ fontSize: TXT.xl, marginBottom: SP.sm }}>{at.icon}</div>
                <div style={{ fontSize: TXT.md, color: at.color, fontWeight: 600 }}>{at.label}</div>
                <div style={{ fontSize: TXT.sm, color: GRAY[500], marginTop: SP.xs, lineHeight: LH.relaxed }}>{at.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw stream panel — only when researching AND toggled on */}
      {phase === "researching" && showRaw && (
        <div style={{ flex: 1, overflowY: "auto", background: GRAY[950], borderRadius: RAD.lg, padding: SP.lg }}>
          <div style={{ fontSize: TXT.xs, color: GRAY[500], marginBottom: SP.sm, letterSpacing: LS.wide, fontWeight: 600, textTransform: "uppercase" }}>
            Raw stream
          </div>
          <pre style={{
            fontSize: TXT.xs, color: CLR.success, lineHeight: LH.relaxed,
            whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0, opacity: 0.7,
            fontFamily: FONT.mono,
          }}>
            {rawStream}
          </pre>
        </div>
      )}

      {/* Centered progress visual when researching with raw hidden */}
      {phase === "researching" && !showRaw && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            {/* Animated pulse ring */}
            <div style={{
              width: 80, height: 80, borderRadius: "50%", margin: "0 auto",
              border: `2px solid ${CLR.success}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "pulse 2s ease-in-out infinite",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: `radial-gradient(circle, ${CLR.success}20, transparent 70%)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: TXT.xxl,
              }}>
                {partial?.icon || "🔍"}
              </div>
            </div>
            <div style={{ fontSize: TXT.lg, fontWeight: 600, color: T.textPrimary, marginTop: SP.xl }}>
              {partial?.label ? `Building ${partial.label}` : "Researching institution..."}
            </div>
            <div style={{ fontSize: TXT.sm, color: GRAY[400], marginTop: SP.xs }}>
              {completedCount} of {fields.length} components generated
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
