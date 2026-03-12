"use client";

import { useState, useEffect, useRef } from "react";
import type { Department } from "../../types/department";
import { TXT, SP, RAD, LS, LH } from "../../styles/tokens";
import { AGENT_TYPES, EXAMPLE_QUERIES } from "../../data/constants";
import { generateDepartment, tryParse } from "../../lib/ai/streaming";
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
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let f = 0;
    const t = setInterval(()=>{ f=(f+1)%360; setPulse(f); }, 50);
    return ()=>clearInterval(t);
  }, []);

  const generate = async () => {
    if (!query.trim() || phase === "researching") return;
    setPhase("researching"); setRawStream(""); setPartial(null); setParseError(null); setElapsed(0);
    const start = Date.now();
    timerRef.current = setInterval(()=>setElapsed(Math.floor((Date.now()-start)/1000)), 500);
    abortRef.current = new AbortController();
    let acc = "";
    try {
      await generateDepartment(query, placeDetails, chunk => {
        acc += chunk; setRawStream(acc);
        const p = tryParse(acc);
        if (p?.label) setPartial(p);
      }, abortRef.current.signal);
      const final = tryParse(acc);
      if (final?.label) {
        // Embed coordinates from place selection into the generated dept
        if (placeDetails && final) {
          final.coordinates = { lat: placeDetails.lat, lng: placeDetails.lng };
        }
        clearInterval(timerRef.current!);
        onGenerated(final, query);
      } else { setParseError("Could not parse response. Try again."); setPhase("error"); }
    } catch(err: any) {
      clearInterval(timerRef.current!);
      if (err.name !== "AbortError") { setParseError(err.message); setPhase("error"); }
      else setPhase("idle");
    }
  };

  const fields = [
    {key:"label",l:"Identity"},{key:"summary",l:"Summary"},{key:"roles",l:"Roles"},
    {key:"workflows",l:"Workflows"},{key:"sensors",l:"Sensors"},{key:"knowledgeWork",l:"Tasks"},{key:"agents",l:"Agents"},
  ];

  return (
    <div style={{ padding:`${SP.xxl}px 28px`, height:"100%", display:"flex", gap:SP.xxl, overflow:"hidden" }}>
      {/* Left col */}
      <div style={{ width:300, flexShrink:0, display:"flex", flexDirection:"column", gap:SP.lg }}>
        <div>
          <div style={{ fontSize:TXT.sm, color:"#94a3b8", letterSpacing:LS.wide, marginBottom:SP.sm }}>RESEARCH ANY INSTITUTION</div>
          <PlacesAutocomplete
            value={query}
            onChange={setQuery}
            onPlaceSelect={details => {
              setPlaceDetails(details);
              if (details) setQuery(details.name);
            }}
            placeholder="e.g. 'Lagos State Ministry of Health'"
            disabled={phase === "researching"}
            style={{ border: `1px solid ${phase === "researching" ? "#22c55e60" : "#e2e8f0"}`, transition: "border-color 0.2s" }}
          />
          {placeDetails && (
            <div style={{ fontSize: TXT.sm, color: "#22c55e", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <span>📍</span>
              <span style={{ color: "#64748b" }}>{placeDetails.address}</span>
            </div>
          )}
          <div style={{ display:"flex", gap:SP.sm, marginTop:SP.sm }}>
            {phase === "researching" ? (
              <button onClick={()=>{abortRef.current?.abort();clearInterval(timerRef.current!);setPhase("idle");}} style={{ flex:1, background:"#ef444418", border:"1px solid #ef4444", color:"#ef4444", padding:SP.sm, borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit" }}>✕ Cancel</button>
            ) : (
              <button onClick={generate} disabled={!query.trim()} style={{ flex:1, background:query.trim()?"#22c55e18":"transparent", border:`1px solid ${query.trim()?"#22c55e":"#e2e8f0"}`, color:query.trim()?"#22c55e":"#cbd5e1", padding:SP.sm, borderRadius:RAD.sm, cursor:query.trim()?"pointer":"default", fontSize:TXT.md, fontFamily:"inherit", transition:"all 0.15s" }}>⟳ Research + Generate</button>
            )}
          </div>
        </div>

        {/* Examples */}
        {phase === "idle" && (
          <div>
            <div style={{ fontSize:TXT.sm, color:"#cbd5e1", marginBottom:SP.sm }}>TRY THESE</div>
            <div style={{ display:"flex", flexDirection:"column", gap:SP.xs }}>
              {EXAMPLE_QUERIES.map(q=>(
                <button key={q} onClick={()=>{ setQuery(q); setPlaceDetails(null); }} style={{ background:"transparent", border:"1px solid #e2e8f0", color:"#94a3b8", padding:`${SP.xs}px ${SP.sm}px`, borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.sm, fontFamily:"inherit", textAlign:"left", transition:"all 0.1s" }}
                  onMouseEnter={e=>{(e.target as HTMLElement).style.color="#64748b";(e.target as HTMLElement).style.borderColor="#cbd5e1";}}
                  onMouseLeave={e=>{(e.target as HTMLElement).style.color="#94a3b8";(e.target as HTMLElement).style.borderColor="#e2e8f0";}}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {phase === "researching" && (
          <div>
            <div style={{ fontSize:TXT.sm, color:"#22c55e", marginBottom:SP.xs }}>{elapsed}s</div>
            <div style={{ display:"flex", gap:2, marginBottom:SP.md }}>
              {Array.from({length:14}).map((_,i)=>(
                <div key={i} style={{ width:3, borderRadius:2, background:"#22c55e", height:4+12*Math.abs(Math.sin(pulse*0.08+i*0.45)), opacity:0.3+0.7*Math.abs(Math.sin(pulse*0.08+i*0.45)), transition:"height 0.08s" }} />
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {fields.map(f=>{ const found=rawStream.includes(`"${f.key}"`), done=found&&rawStream.indexOf(`"${f.key}"`) < rawStream.length-20; return (
                <div key={f.key} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:done?"#22c55e":found?"#f59e0b":"#e2e8f0", boxShadow:found&&!done?"0 0 6px #f59e0b":"none", transition:"all 0.3s" }} />
                  <span style={{ fontSize:TXT.sm, color:done?"#22c55e":found?"#f59e0b":"#cbd5e1" }}>{f.l}</span>
                  {done && <span style={{ fontSize:TXT.sm, color:"#22c55e" }}>✓</span>}
                </div>
              );})}
            </div>
            {partial?.label && (
              <div style={{ marginTop:SP.lg, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:RAD.md, padding:SP.sm }}>
                <div style={{ fontSize:TXT.xl }}>{partial.icon}</div>
                <div style={{ fontSize:TXT.md, color:partial.color||"#22c55e", fontWeight:700, marginTop:2 }}>{partial.label}</div>
                {partial.region && <div style={{ fontSize:TXT.sm, color:"#94a3b8", marginTop:2 }}>{partial.region}</div>}
                <div style={{ display:"flex", gap:SP.sm, marginTop:SP.sm, flexWrap:"wrap" }}>
                  <span style={{ fontSize:TXT.sm, color:"#1e293b" }}>👤 {partial.roles?.length||0}</span>
                  <span style={{ fontSize:TXT.sm, color:"#60a5fa" }}>⟶ {partial.workflows?.length||0}</span>
                  <span style={{ fontSize:TXT.sm, color:"#a78bfa" }}>📡 {partial.sensors?.length||0}</span>
                  <span style={{ fontSize:TXT.sm, color:"#f59e0b" }}>🤖 {partial.agents?.length||0}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {phase === "error" && (
          <div style={{ background:"#ef444415", border:"1px solid #ef444440", borderRadius:RAD.sm, padding:SP.md }}>
            <div style={{ color:"#ef4444", fontSize:TXT.md, marginBottom:SP.xs }}>Error</div>
            <div style={{ fontSize:TXT.sm, color:"#64748b" }}>{parseError}</div>
          </div>
        )}
      </div>

      {/* Right col: agent type explainer when idle */}
      {phase === "idle" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center", gap:20 }}>
          <div style={{ fontSize:TXT.sm, color:"#e2e8f0", letterSpacing:LS.wide, textAlign:"center" }}>GENERATES COMPLETE DEPARTMENT SCHEMA + AGENT ARCHITECTURE</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:SP.md, maxWidth:440, width:"100%" }}>
            {Object.entries(AGENT_TYPES).map(([type,at])=>(
              <div key={type} style={{ background:"#f8fafc", border:`1px solid ${at.color}28`, borderRadius:RAD.lg, padding:`${SP.md}px ${SP.lg}px` }}>
                <div style={{ fontSize:TXT.xl, marginBottom:SP.xs }}>{at.icon}</div>
                <div style={{ fontSize:TXT.md, color:at.color, fontWeight:600 }}>{at.label}</div>
                <div style={{ fontSize:TXT.sm, color:"#cbd5e1", marginTop:2 }}>{at.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw stream */}
      {phase === "researching" && (
        <div style={{ flex:1, overflowY:"auto" }}>
          <div style={{ fontSize:TXT.sm, color:"#e2e8f0", marginBottom:SP.sm, letterSpacing:LS.normal }}>RAW STREAM</div>
          <pre style={{ fontSize:TXT.xs, color:"#22c55e", lineHeight:LH.relaxed, whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0, opacity:0.6 }}>{rawStream}</pre>
        </div>
      )}
    </div>
  );
}
