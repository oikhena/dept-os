import type { Department, Advisor } from "../types/department";

export function computeAdvisors(dept: Department): Advisor[] {
  const advisors: Advisor[] = [];
  const costSinks = (dept.workflows||[]).filter(w => w.valueFlow === "costSink");
  if (costSinks.length) advisors.push({ icon:"🔴", label:`${costSinks.length} cost sink${costSinks.length>1?"s":""}`, tab:"value-flows", filter:"costSink", color:"#ef4444" });
  const leaks = (dept.workflows||[]).filter(w => w.valueFlow === "valueLeak");
  if (leaks.length) advisors.push({ icon:"⚠️", label:`${leaks.length} value leak${leaks.length>1?"s":""}`, tab:"value-flows", filter:"valueLeak", color:"#f59e0b" });
  const risks = (dept.workflows||[]).filter(w => w.valueFlow === "riskNode");
  if (risks.length) advisors.push({ icon:"🔷", label:`${risks.length} risk node${risks.length>1?"s":""}`, tab:"value-flows", filter:"riskNode", color:"#a78bfa" });
  const sc = (dept.knowledgeWork||[]).filter(k => k.aiImpact === "shortcircuit");
  if (sc.length) advisors.push({ icon:"🔁", label:`${sc.length} shortcircuit opp${sc.length>1?"s":""}`, tab:"knowledge", filter:null, color:"#f59e0b" });
  const su = (dept.knowledgeWork||[]).filter(k => k.aiImpact === "supercharge");
  if (su.length) advisors.push({ icon:"⚡", label:`${su.length} supercharge opp${su.length>1?"s":""}`, tab:"knowledge", filter:null, color:"#22c55e" });
  const p1 = (dept.agents||[]).filter(a => a.priority === 1);
  if (p1.length) advisors.push({ icon:"🤖", label:`${p1.length} P1 agent${p1.length>1?"s":""} ready`, tab:"agents", filter:null, color:"#38bdf8" });
  return advisors;
}
