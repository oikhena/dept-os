"use client";

import { useState, useRef, Dispatch, SetStateAction } from "react";
import type { Department } from "../../types/department";
import { TXT, SP, RAD, LS, LH } from "../../styles/tokens";
import { VALUE_FLOW_COLORS, ROLE_ICONS, ACCENT_COLORS } from "../../data/constants";

interface DepartmentBuilderProps {
  dept: Department;
  setDept: Dispatch<SetStateAction<Department>>;
  onDone: () => void;
}

export default function DepartmentBuilder({ dept, setDept, onDone }: DepartmentBuilderProps) {
  const [step, setStep] = useState("meta");
  const [roleForm, setRoleForm] = useState({ label:"", icon:"👤", x:50, y:50 });
  const [wfForm, setWfForm] = useState({ from:"", to:"", label:"", type:"knowledge", aiImpact:"high", valueFlow:"valueCreate" });
  const [taskForm, setTaskForm] = useState({ role:"", label:"", effort:5, frequency:"Daily", aiImpact:"supercharge" as "supercharge"|"shortcircuit", aiNote:"", costPerYear:"" });
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const inp = (val: string, fn: (v: string) => void, ph: string, w="100%") => <input value={val} onChange={e=>fn(e.target.value)} placeholder={ph} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", color:"#1e293b", padding:`6px ${SP.sm}px`, borderRadius:RAD.sm, fontSize:TXT.md, fontFamily:"inherit", outline:"none", width:w, boxSizing:"border-box" }} />;
  const sel = (val: string, fn: (v: string) => void, opts: {v:string,l:string}[]) => <select value={val} onChange={e=>fn(e.target.value)} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", color:"#1e293b", padding:`6px ${SP.sm}px`, borderRadius:RAD.sm, fontSize:TXT.md, fontFamily:"inherit", outline:"none", width:"100%" }}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>;

  const steps = ["meta","roles","workflows","tasks","preview"];
  const stepLabels = ["1·Identity","2·Roles","3·Flows","4·Tasks","5·Preview"];

  return (
    <div style={{ display:"flex", height:"100%" }}>
      <div style={{ width:140, background:"#f1f5f9", borderRight:"1px solid #e2e8f0", padding:"16px 0", flexShrink:0 }}>
        {steps.map((s,i) => <button key={s} onClick={()=>setStep(s)} style={{ display:"block", width:"100%", textAlign:"left", background:step===s?dept.color+"18":"transparent", border:"none", borderLeft:step===s?`3px solid ${dept.color}`:"3px solid transparent", color:step===s?dept.color:"#94a3b8", padding:`${SP.sm}px ${SP.lg}px`, cursor:"pointer", fontSize:TXT.sm, fontFamily:"inherit", letterSpacing:LS.normal }}>{stepLabels[i]}</button>)}
      </div>
      <div style={{ flex:1, padding:20, overflowY:"auto" }}>
        {step === "meta" && (
          <div style={{ display:"grid", gap:12 }}>
            <div style={{ fontSize:TXT.md, color:dept.color, letterSpacing:LS.wide, marginBottom:SP.xs }}>IDENTITY</div>
            {inp(dept.label, v=>setDept(d=>({...d,label:v})), "Department name")}
            <textarea value={dept.summary} onChange={e=>setDept(d=>({...d,summary:e.target.value}))} placeholder="Describe this department…" style={{ background:"#f8fafc", border:"1px solid #e2e8f0", color:"#1e293b", padding:`${SP.sm}px ${SP.sm}px`, borderRadius:RAD.sm, fontSize:TXT.md, fontFamily:"inherit", outline:"none", height:80, resize:"vertical" }} />
            <div>
              <div style={{ fontSize:TXT.sm, color:"#94a3b8", marginBottom:SP.sm }}>ICON</div>
              <div style={{ display:"flex", gap:SP.xs, flexWrap:"wrap" }}>
                {["🏢","🏥","🏫","🏙️","🚨","🛂","🚔","💉","⚖️","🚰","🏭","🌐","🎓","🏦","🛰️","🤖","🏗️","💡"].map(ic=>(
                  <button key={ic} onClick={()=>setDept(d=>({...d,icon:ic}))} style={{ width:30, height:30, background:dept.icon===ic?dept.color+"25":"#f8fafc", border:`1px solid ${dept.icon===ic?dept.color:"#e2e8f0"}`, borderRadius:RAD.sm, cursor:"pointer", fontSize:16 }}>{ic}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:TXT.sm, color:"#94a3b8", marginBottom:SP.sm }}>ACCENT COLOR</div>
              <div style={{ display:"flex", gap:SP.xs, flexWrap:"wrap" }}>
                {ACCENT_COLORS.map(c=><button key={c} onClick={()=>setDept(d=>({...d,color:c}))} style={{ width:22, height:22, background:c, borderRadius:"50%", border:dept.color===c?`2px solid #fff`:"2px solid transparent", cursor:"pointer" }} />)}
              </div>
            </div>
            <button onClick={()=>setStep("roles")} style={{ background:dept.color+"20", border:`1px solid ${dept.color}`, color:dept.color, padding:`${SP.sm}px ${SP.xl}px`, borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit" }}>Next → Roles</button>
          </div>
        )}

        {step === "roles" && (
          <div>
            <div style={{ fontSize:TXT.md, color:dept.color, letterSpacing:LS.wide, marginBottom:SP.md }}>ROLES & POSITIONS</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ display:"grid", gap:8 }}>
                {inp(roleForm.label, v=>setRoleForm(f=>({...f,label:v})), "Role name (e.g. 'Case Manager')")}
                <div>
                  <div style={{ fontSize:TXT.sm, color:"#94a3b8", marginBottom:SP.xs }}>ICON</div>
                  <div style={{ display:"flex", gap:3, flexWrap:"wrap", maxHeight:100, overflowY:"auto" }}>
                    {ROLE_ICONS.map(ic=><button key={ic} onClick={()=>setRoleForm(f=>({...f,icon:ic}))} style={{ width:26, height:26, background:roleForm.icon===ic?dept.color+"25":"#f8fafc", border:`1px solid ${roleForm.icon===ic?dept.color:"#e2e8f0"}`, borderRadius:RAD.sm, cursor:"pointer", fontSize:13 }}>{ic}</button>)}
                  </div>
                </div>
                <button onClick={()=>{ if(!roleForm.label.trim()) return; const id="r_"+Date.now(); setDept(d=>({...d,roles:[...d.roles,{...roleForm,id}]})); setRoleForm({label:"",icon:"👤",x:20+Math.random()*60,y:20+Math.random()*55}); }} style={{ background:dept.color+"20", border:`1px solid ${dept.color}`, color:dept.color, padding:"7px", borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit" }}>+ Add Role</button>
                {dept.roles.map(r=>(
                  <div key={r.id} style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:RAD.sm, padding:`${SP.xs}px ${SP.sm}px`, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:TXT.md, color:"#334155" }}>
                    <span>{r.icon} {r.label}</span>
                    <button onClick={()=>setDept(d=>({...d,roles:d.roles.filter(x=>x.id!==r.id),workflows:d.workflows.filter(w=>w.from!==r.id&&w.to!==r.id),knowledgeWork:d.knowledgeWork.filter(k=>k.role!==r.id)}))} style={{ background:"transparent", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:11 }}>✕</button>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize:TXT.sm, color:"#94a3b8", marginBottom:SP.sm }}>POSITION ON MAP (drag roles)</div>
                <svg ref={svgRef} viewBox="0 0 100 100" style={{ width:"100%", height:200, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:4, cursor:"crosshair" }}
                  onMouseMove={e=>{ if(!dragging||!svgRef.current) return; const r=svgRef.current.getBoundingClientRect(); const x=Math.round(((e.clientX-r.left)/r.width)*100), y=Math.round(((e.clientY-r.top)/r.height)*100); setDept(d=>({...d,roles:d.roles.map(ro=>ro.id===dragging?{...ro,x:Math.max(8,Math.min(92,x)),y:Math.max(8,Math.min(92,y))}:ro)})); }}
                  onMouseUp={()=>setDragging(null)} onMouseLeave={()=>setDragging(null)}>
                  {[20,40,60,80].map(x=>[20,40,60,80].map(y=><circle key={`${x}${y}`} cx={x} cy={y} r={0.5} fill="#e2e8f0"/>))}
                  {dept.roles.map(r=>(
                    <g key={r.id} onMouseDown={e=>{e.preventDefault();setDragging(r.id);}} style={{ cursor:"grab" }}>
                      <circle cx={r.x} cy={r.y} r={6} fill="#f1f5f9" stroke={dept.color} strokeWidth={0.5}/>
                      <text x={r.x} y={r.y+1} textAnchor="middle" fontSize="5" style={{ userSelect:"none", pointerEvents:"none" }}>{r.icon}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
            <button onClick={()=>setStep("workflows")} style={{ marginTop:SP.lg, background:dept.color+"20", border:`1px solid ${dept.color}`, color:dept.color, padding:`${SP.sm}px ${SP.xl}px`, borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit" }}>Next → Workflows</button>
          </div>
        )}

        {step === "workflows" && (
          <div>
            <div style={{ fontSize:TXT.md, color:dept.color, letterSpacing:LS.wide, marginBottom:SP.md }}>WORKFLOWS</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ display:"grid", gap:8 }}>
                {sel(wfForm.from, v=>setWfForm(f=>({...f,from:v})), [{v:"",l:"— From role —"},...dept.roles.map(r=>({v:r.id,l:r.icon+" "+r.label}))])}
                {sel(wfForm.to, v=>setWfForm(f=>({...f,to:v})), [{v:"",l:"— To role —"},...dept.roles.map(r=>({v:r.id,l:r.icon+" "+r.label}))])}
                {inp(wfForm.label, v=>setWfForm(f=>({...f,label:v})), "Flow label (e.g. 'Case handoff')")}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {sel(wfForm.type, v=>setWfForm(f=>({...f,type:v})), [{v:"knowledge",l:"Knowledge"},{v:"physical",l:"Physical"}])}
                  {sel(wfForm.aiImpact, v=>setWfForm(f=>({...f,aiImpact:v})), [{v:"high",l:"High AI"},{v:"medium",l:"Med AI"},{v:"low",l:"Low AI"}])}
                </div>
                {sel(wfForm.valueFlow, v=>setWfForm(f=>({...f,valueFlow:v})), [{v:"valueCreate",l:"✅ Value creation"},{v:"costSink",l:"🔴 Cost sink"},{v:"valueLeak",l:"⚠️ Value leak"},{v:"riskNode",l:"🔷 Risk node"}])}
                <button onClick={()=>{ if(!wfForm.from||!wfForm.to||!wfForm.label.trim()) return; const id="wf_"+Date.now(); setDept(d=>({...d,workflows:[...d.workflows,{...wfForm,id} as any]})); setWfForm(f=>({...f,label:"",from:"",to:""})); }} style={{ background:dept.color+"20", border:`1px solid ${dept.color}`, color:dept.color, padding:"7px", borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit" }}>+ Add Workflow</button>
              </div>
              <div>
                {dept.workflows.map(wf=>{ const f=dept.roles.find(r=>r.id===wf.from), t=dept.roles.find(r=>r.id===wf.to), c=VALUE_FLOW_COLORS[wf.valueFlow]; return (
                  <div key={wf.id} style={{ background:"#f8fafc", border:`1px solid ${c}30`, borderLeft:`2px solid ${c}`, borderRadius:RAD.sm, padding:`${SP.sm}px ${SP.sm}px`, marginBottom:SP.xs, display:"flex", justifyContent:"space-between" }}>
                    <div><div style={{ fontSize:TXT.md, color:"#334155" }}>{wf.label}</div><div style={{ fontSize:TXT.sm, color:"#94a3b8" }}>{f?.icon}→{t?.icon}</div></div>
                    <button onClick={()=>setDept(d=>({...d,workflows:d.workflows.filter(w=>w.id!==wf.id)}))} style={{ background:"transparent", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:11 }}>✕</button>
                  </div>
                );})}
              </div>
            </div>
            <button onClick={()=>setStep("tasks")} style={{ marginTop:SP.lg, background:dept.color+"20", border:`1px solid ${dept.color}`, color:dept.color, padding:`${SP.sm}px ${SP.xl}px`, borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit" }}>Next → Tasks</button>
          </div>
        )}

        {step === "tasks" && (
          <div>
            <div style={{ fontSize:TXT.md, color:dept.color, letterSpacing:LS.wide, marginBottom:SP.md }}>KNOWLEDGE TASKS</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ display:"grid", gap:8 }}>
                {sel(taskForm.role, v=>setTaskForm(f=>({...f,role:v})), [{v:"",l:"— Assign to role —"},...dept.roles.map(r=>({v:r.id,l:r.icon+" "+r.label}))])}
                {inp(taskForm.label, v=>setTaskForm(f=>({...f,label:v})), "Task name")}
                <div>
                  <div style={{ fontSize:TXT.sm, color:"#94a3b8", marginBottom:3 }}>EFFORT (1–10): {taskForm.effort}</div>
                  <input type="range" min={1} max={10} value={taskForm.effort} onChange={e=>setTaskForm(f=>({...f,effort:+e.target.value}))} style={{ width:"100%", accentColor:dept.color }} />
                </div>
                {inp(taskForm.frequency, v=>setTaskForm(f=>({...f,frequency:v})), "Frequency (e.g. 'Per case', 'Daily')")}
                {sel(taskForm.aiImpact, v=>setTaskForm(f=>({...f,aiImpact:v as "supercharge"|"shortcircuit"})), [{v:"supercharge",l:"⚡ Supercharge — AI amplifies"},{v:"shortcircuit",l:"🔁 Shortcircuit — AI replaces"}])}
                {inp(taskForm.aiNote, v=>setTaskForm(f=>({...f,aiNote:v})), "AI opportunity note")}
                {inp(taskForm.costPerYear, v=>setTaskForm(f=>({...f,costPerYear:v})), "Annual cost estimate")}
                <button onClick={()=>{ if(!taskForm.role||!taskForm.label.trim()) return; const id="k_"+Date.now(); setDept(d=>({...d,knowledgeWork:[...d.knowledgeWork,{...taskForm,id} as any]})); setTaskForm(f=>({...f,label:"",aiNote:"",costPerYear:""})); }} style={{ background:dept.color+"20", border:`1px solid ${dept.color}`, color:dept.color, padding:"7px", borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit" }}>+ Add Task</button>
              </div>
              <div>
                {dept.knowledgeWork.map(k=>{ const r=dept.roles.find(x=>x.id===k.role); return (
                  <div key={k.id} style={{ background:"#f8fafc", border:`1px solid ${k.aiImpact==="supercharge"?"#22c55e30":"#f59e0b30"}`, borderRadius:RAD.sm, padding:`${SP.sm}px ${SP.sm}px`, marginBottom:SP.sm, display:"flex", justifyContent:"space-between" }}>
                    <div><div style={{ fontSize:TXT.md, color:"#334155" }}>{k.label}</div><div style={{ fontSize:TXT.sm, color:"#94a3b8" }}>{r?.icon} {r?.label} · {k.frequency}</div><span style={{ fontSize:TXT.sm, color:k.aiImpact==="supercharge"?"#22c55e":"#f59e0b" }}>{k.aiImpact==="supercharge"?"⚡":"🔁"}</span></div>
                    <button onClick={()=>setDept(d=>({...d,knowledgeWork:d.knowledgeWork.filter(x=>x.id!==k.id)}))} style={{ background:"transparent", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:11 }}>✕</button>
                  </div>
                );})}
              </div>
            </div>
            <button onClick={()=>setStep("preview")} style={{ marginTop:SP.lg, background:dept.color+"20", border:`1px solid ${dept.color}`, color:dept.color, padding:`${SP.sm}px ${SP.xl}px`, borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit" }}>Next → Preview</button>
          </div>
        )}

        {step === "preview" && (
          <div>
            <div style={{ fontSize:TXT.md, color:dept.color, letterSpacing:LS.wide, marginBottom:SP.md }}>PREVIEW — {dept.icon} {dept.label}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:SP.sm, marginBottom:SP.lg }}>
              {[{l:"Roles",v:dept.roles.length,c:dept.color},{l:"Workflows",v:dept.workflows.length,c:"#a78bfa"},{l:"Tasks",v:dept.knowledgeWork.length,c:"#22c55e"},{l:"⚡",v:dept.knowledgeWork.filter(k=>k.aiImpact==="supercharge").length,c:"#f59e0b"}].map(s=>(
                <div key={s.l} style={{ background:"#f1f5f9", border:`1px solid ${s.c}28`, borderRadius:RAD.sm, padding:SP.md, textAlign:"center" }}>
                  <div style={{ fontSize:TXT.xl, fontWeight:700, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:TXT.sm, color:"#94a3b8" }}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"#f1f5f9", border:`1px solid ${dept.color}28`, borderRadius:RAD.sm, padding:SP.lg, marginBottom:SP.lg, fontSize:TXT.md, color:"#64748b", lineHeight:LH.relaxed }}>{dept.summary||"No description."}</div>
            <button onClick={onDone} style={{ background:dept.color, border:"none", color:"#000", padding:`${SP.sm}px 28px`, borderRadius:RAD.sm, cursor:"pointer", fontSize:TXT.md, fontFamily:"inherit", fontWeight:700 }}>Launch {dept.icon} {dept.label} →</button>
          </div>
        )}
      </div>
    </div>
  );
}
