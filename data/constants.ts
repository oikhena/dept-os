import type { AgentType } from "../types/department";

export const VALUE_FLOW_COLORS: Record<string, string> = { valueCreate:"#22c55e", costSink:"#ef4444", valueLeak:"#f59e0b", riskNode:"#a78bfa" };
export const VALUE_FLOW_LABELS: Record<string, string> = { valueCreate:"✅ Value creation", costSink:"🔴 Cost sink", valueLeak:"⚠️ Value leak", riskNode:"🔷 Risk node" };
export const SENSE_COLORS: Record<string, string> = { sight:"#60a5fa", sound:"#a78bfa", smell:"#34d399", touch:"#fb923c", taste:"#f472b6" };
export const SENSE_ICONS: Record<string, string> = { sight:"👁️", sound:"👂", smell:"👃", touch:"✋", taste:"👅" };
export const AGENT_TYPES: Record<string, AgentType> = {
  web:   { label:"Web Agent",           icon:"🌐", color:"#38bdf8", desc:"Browser/server — docs, research, scheduling, forms" },
  mobile:{ label:"Mobile Agent",        icon:"📱", color:"#a78bfa", desc:"Phone/tablet — field reports, voice intake, photos" },
  edge:  { label:"Edge / IoT Agent",    icon:"📡", color:"#34d399", desc:"Sensor/device — continuous monitoring, real-time alerts" },
  orch:  { label:"Orchestration Agent", icon:"🧠", color:"#f59e0b", desc:"Backend — cross-agent coordination, data fusion" },
};
export const ROLE_ICONS = ["👤","👨‍💼","👩‍💼","👨‍⚕️","👩‍⚕️","👨‍🏫","👩‍🏫","👮","👷","🧑‍💻","👨‍🔬","👩‍🔬","🧑‍⚖️","👨‍🚒","🧑‍🚀","🤝","📋","🔍","⚙️","📊","🗂️","🛡️","🔧","🎧","🚓","🏛️","🌿","🔬"];
export const ACCENT_COLORS = ["#00b4d8","#f4a261","#52b788","#ef4444","#8b5cf6","#3b82f6","#10b981","#d97706","#06b6d4","#e11d48","#84cc16","#f472b6","#fb923c","#a78bfa"];
export const EXAMPLE_QUERIES = [
  "Lagos State Ministry of Education, Nigeria",
  "Nairobi City Water & Sewerage, Kenya",
  "Municipal court system, São Paulo",
  "Rural district hospital, Kano State Nigeria",
  "NYC Dept of Buildings permit office",
  "Community health clinic, Accra Ghana",
  "Emergency dispatch center, Mexico City",
  "Port customs & immigration, Mombasa Kenya",
];
