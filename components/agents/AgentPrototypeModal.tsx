"use client";

import { useState, useEffect, useRef } from "react";
import type { Agent, Department } from "../../types/department";
import { TXT, SP, RAD, LS, LH } from "../../styles/tokens";
import { AGENT_TYPES } from "../../data/constants";
import { API_URL, buildSystemPrompt, buildScaffold } from "../../lib/ai/prompts";

interface AgentPrototypeModalProps {
  agent: Agent;
  dept: Department;
  onClose: () => void;
}

export default function AgentPrototypeModal({ agent, dept, onClose }: AgentPrototypeModalProps) {
  const [mode, setMode] = useState<"chat" | "scaffold">("chat");
  const [messages, setMessages] = useState<{role:string,content:string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const at = AGENT_TYPES[agent.type] || AGENT_TYPES.web;
  const systemPrompt = buildSystemPrompt(agent, dept);
  const scaffold = buildScaffold(agent, dept, systemPrompt);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, streamText]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role:"user", content:userMsg }]);
    setLoading(true);
    setStreamText("");

    abortRef.current = new AbortController();
    let full = "";

    try {
      const history = [...messages, { role:"user", content:userMsg }];
      const res = await fetch(API_URL, {
        method:"POST", signal: abortRef.current.signal,
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          stream:true,
          system: systemPrompt,
          messages: history
        })
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream:true });
        const lines = buf.split("\n");
        buf = lines.pop()!;
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const evt = JSON.parse(data);
            if (evt.type === "content_block_delta" && evt.delta?.text) {
              full += evt.delta.text;
              setStreamText(full);
            }
          } catch {}
        }
      }
      setMessages(prev => [...prev, { role:"assistant", content:full }]);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages(prev => [...prev, { role:"assistant", content:"[Error connecting to agent]" }]);
      }
    } finally {
      setLoading(false);
      setStreamText("");
    }
  };

  const STARTER_PROMPTS: Record<string, string[]> = {
    web: [`Trigger: ${agent.trigger}`, "Walk me through a realistic example scenario", "What would you output for a typical case?"],
    mobile: [`I'm in the field. ${agent.trigger}`, "Show me your output format", "What do you need from me to complete your task?"],
    edge: ["Simulated sensor data: [threshold crossed — run analysis]", "What patterns are you currently detecting?", "Generate a sample alert output"],
    orch: ["Run a coordination cycle across all connected agents", "What cross-agent patterns are you tracking?", "Synthesize a status report"],
  };
  const starters = STARTER_PROMPTS[agent.type] || STARTER_PROMPTS.web;

  return (
    <div style={{ position:"fixed", inset:0, background:"#00000066", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width:"min(860px, 95vw)", height:"min(680px, 90vh)", background:"#f8fafc", border:`1px solid ${at.color}44`, borderRadius:RAD.lg, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:`0 0 60px ${at.color}18` }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:SP.md, padding:`${SP.lg}px ${SP.xl}px`, borderBottom:`1px solid ${at.color}22`, background:"#ffffff", flexShrink:0 }}>
          <span style={{ fontSize:20 }}>{at.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:TXT.lg, color:"#1e293b", fontWeight:700 }}>{agent.name}</div>
            <div style={{ fontSize:TXT.sm, color:at.color, letterSpacing:LS.normal }}>{dept.label} · {at.label} · P{agent.priority}</div>
          </div>
          <div style={{ display:"flex", background:"#f1f5f9", borderRadius:RAD.sm, border:"1px solid #e2e8f0", overflow:"hidden" }}>
            {([["chat","⚡ Live Agent"],["scaffold","</> Scaffold"]] as const).map(([m,l]) => (
              <button key={m} onClick={() => setMode(m as "chat" | "scaffold")}
                style={{ background:mode===m ? at.color+"22":"transparent", border:"none", color:mode===m ? at.color:"#94a3b8", padding:`${SP.xs}px ${SP.md}px`, cursor:"pointer", fontSize:TXT.sm, fontFamily:"inherit", letterSpacing:LS.normal, transition:"all 0.15s" }}>{l}</button>
            ))}
          </div>
          <button onClick={onClose} style={{ background:"transparent", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:16, padding:"0 4px" }}>✕</button>
        </div>

        {/* Chat mode */}
        {mode === "chat" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
            <div style={{ flex:1, overflowY:"auto", padding:`${SP.lg}px ${SP.xl}px`, display:"flex", flexDirection:"column", gap:SP.md }}>
              <div style={{ background:"#ffffff", border:`1px solid ${at.color}20`, borderRadius:RAD.md, padding:`${SP.sm}px ${SP.lg}px` }}>
                <div style={{ fontSize:TXT.sm, color:at.color, letterSpacing:LS.wide, marginBottom:SP.xs }}>AGENT SPEC LOADED</div>
                <div style={{ fontSize:TXT.sm, color:"#cbd5e1", lineHeight:LH.relaxed }}>
                  <span style={{ color:"#94a3b8" }}>Trigger:</span> {agent.trigger}<br/>
                  <span style={{ color:"#94a3b8" }}>Output:</span> {agent.output}<br/>
                  {agent.humanInLoop && <><span style={{ color:"#f59e0b" }}>Human review:</span> {agent.humanInLoop}</>}
                </div>
              </div>

              {messages.length === 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:SP.sm }}>
                  <div style={{ fontSize:TXT.sm, color:"#e2e8f0", letterSpacing:LS.normal, marginBottom:2 }}>TRY THESE</div>
                  {starters.map((s,i) => (
                    <button key={i} onClick={() => { setInput(s); }}
                      style={{ background:"#f1f5f9", border:`1px solid ${at.color}22`, color:"#94a3b8", padding:`${SP.sm}px ${SP.md}px`, borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit", textAlign:"left", transition:"all 0.12s" }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.color="#64748b"; (e.target as HTMLElement).style.borderColor=at.color+"44"; }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.color="#94a3b8"; (e.target as HTMLElement).style.borderColor=at.color+"22"; }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{
                    maxWidth:"80%",
                    background: m.role==="user" ? at.color+"18" : "#f1f5f9",
                    border: `1px solid ${m.role==="user" ? at.color+"33" : "#e2e8f0"}`,
                    borderRadius:RAD.lg,
                    padding:`${SP.sm}px ${SP.lg}px`,
                  }}>
                    {m.role === "assistant" && (
                      <div style={{ fontSize:TXT.sm, color:at.color, letterSpacing:LS.normal, marginBottom:SP.xs }}>{agent.name.toUpperCase()}</div>
                    )}
                    <div style={{ fontSize:TXT.md, color: m.role==="user" ? "#334155":"#64748b", lineHeight:LH.relaxed, whiteSpace:"pre-wrap" }}>
                      {m.content}
                    </div>
                    {m.content?.includes("⚠️ HUMAN REVIEW NEEDED") && (
                      <div style={{ marginTop:SP.sm, background:"#f59e0b18", border:"1px solid #f59e0b33", borderRadius:RAD.sm, padding:`${SP.xs}px ${SP.sm}px`, fontSize:TXT.sm, color:"#f59e0b" }}>
                        👤 Human review required per agent spec
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && streamText && (
                <div style={{ display:"flex", justifyContent:"flex-start" }}>
                  <div style={{ maxWidth:"80%", background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:RAD.lg, padding:`${SP.sm}px ${SP.lg}px` }}>
                    <div style={{ fontSize:TXT.sm, color:at.color, letterSpacing:LS.normal, marginBottom:SP.xs }}>{agent.name.toUpperCase()}</div>
                    <div style={{ fontSize:TXT.md, color:"#64748b", lineHeight:LH.relaxed, whiteSpace:"pre-wrap" }}>{streamText}<span style={{ opacity:0.5 }}>▋</span></div>
                  </div>
                </div>
              )}
              {loading && !streamText && (
                <div style={{ display:"flex", gap:4, paddingLeft:4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:at.color, opacity:0.4, animation:`bounce 1s ${i*0.15}s infinite` }} />)}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <div style={{ padding:`${SP.md}px ${SP.lg}px`, borderTop:"1px solid #e2e8f0", display:"flex", gap:SP.sm, flexShrink:0, background:"#ffffff" }}>
              <input value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
                placeholder={`Send input to ${agent.name}...`}
                style={{ flex:1, background:"#f1f5f9", border:"1px solid #e2e8f0", color:"#1e293b", padding:`9px ${SP.md}px`, borderRadius:RAD.sm, fontSize:TXT.md, fontFamily:"inherit", outline:"none" }} />
              <button onClick={send} disabled={!input.trim()||loading}
                style={{ background:input.trim()&&!loading ? at.color+"20":"transparent", border:`1px solid ${input.trim()&&!loading ? at.color : "#e2e8f0"}`, color:input.trim()&&!loading ? at.color : "#cbd5e1", padding:`9px ${SP.lg}px`, borderRadius:RAD.sm, cursor:input.trim()&&!loading?"pointer":"default", fontSize:TXT.md, fontFamily:"inherit", transition:"all 0.15s" }}>
                {loading ? "…" : "→ Send"}
              </button>
            </div>
          </div>
        )}

        {/* Scaffold mode */}
        {mode === "scaffold" && (
          <div style={{ flex:1, display:"flex", gap:0, minHeight:0 }}>
            <div style={{ flex:1, display:"flex", flexDirection:"column", borderRight:"1px solid #e2e8f0", minHeight:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:`${SP.sm}px ${SP.lg}px`, borderBottom:"1px solid #e2e8f0", flexShrink:0 }}>
                <span style={{ fontSize:TXT.sm, color:"#94a3b8", letterSpacing:LS.wide }}>SYSTEM PROMPT</span>
                <button onClick={() => copy(systemPrompt, "sp")}
                  style={{ background:"transparent", border:`1px solid ${copied==="sp"?"#22c55e":"#e2e8f0"}`, color:copied==="sp"?"#22c55e":"#94a3b8", padding:"3px 9px", borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.sm, fontFamily:"inherit" }}>
                  {copied==="sp" ? "✓ copied" : "copy"}
                </button>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:SP.lg }}>
                <pre style={{ fontSize:TXT.sm, color:"#64748b", lineHeight:LH.relaxed, whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0 }}>{systemPrompt}</pre>
              </div>
            </div>
            <div style={{ flex:1, display:"flex", flexDirection:"column", minHeight:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:`${SP.sm}px ${SP.lg}px`, borderBottom:"1px solid #e2e8f0", flexShrink:0 }}>
                <span style={{ fontSize:TXT.sm, color:"#94a3b8", letterSpacing:LS.wide }}>NEXT.JS API ROUTE</span>
                <button onClick={() => copy(scaffold, "sc")}
                  style={{ background:"transparent", border:`1px solid ${copied==="sc"?"#22c55e":"#e2e8f0"}`, color:copied==="sc"?"#22c55e":"#94a3b8", padding:"3px 9px", borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.sm, fontFamily:"inherit" }}>
                  {copied==="sc" ? "✓ copied" : "copy"}
                </button>
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:SP.lg }}>
                <pre style={{ fontSize:TXT.sm, color:"#64748b", lineHeight:LH.relaxed, whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0 }}>{scaffold}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
