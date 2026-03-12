import type { Agent, Department } from "../../types/department";

export function buildChatSystemPrompt(dept: Department): string {
  const roles = (dept.roles || []).map(r => `${r.icon} ${r.label}`).join(", ");
  const workflows = (dept.workflows || []).map(w => {
    const from = dept.roles?.find(r => r.id === w.from);
    const to = dept.roles?.find(r => r.id === w.to);
    return `- ${from?.label} → ${to?.label}: ${w.label} [${w.valueFlow}, AI: ${w.aiImpact}]`;
  }).join("\n");
  const tasks = (dept.knowledgeWork || []).map(k => {
    const role = dept.roles?.find(r => r.id === k.role);
    return `- ${k.label} (${role?.label}): ${k.aiImpact} — ${k.aiNote}${k.costPerYear ? ` | Cost: ${k.costPerYear}` : ""}`;
  }).join("\n");
  const agents = (dept.agents || []).map(a =>
    `- P${a.priority} ${a.name} (${a.type}): ${a.trigger} → ${a.output}`
  ).join("\n");

  return `You are an expert AI analyst helping users understand and optimize the operations of ${dept.label}.

INSTITUTION OVERVIEW:
${dept.summary}${dept.region ? `\nRegion: ${dept.region}` : ""}${dept.infrastructure ? `\nInfrastructure: ${dept.infrastructure}` : ""}

ROLES: ${roles}

WORKFLOWS:
${workflows}

KNOWLEDGE WORK & AI OPPORTUNITIES:
${tasks}

AI AGENTS DESIGNED:
${agents}

BEHAVIOR:
- Answer questions about this specific institution — reference real roles, workflows, and agents from the data above
- Be specific and operational. Cite task names, role names, cost figures where relevant.
- When asked about improvements, draw on the knowledge work and agent priority data
- Keep responses concise and actionable (2-4 short paragraphs max unless asked for more)
- You can suggest refinements, compare to similar institutions, or estimate ROI
- Do NOT respond with raw JSON unless explicitly asked`;
}
export function buildReportPrompt(dept: Department): string {
  const roles = (dept.roles || []).map(r => `${r.icon} ${r.label}`).join(", ");
  const topTasks = [...(dept.knowledgeWork || [])]
    .sort((a, b) => b.effort - a.effort)
    .slice(0, 6)
    .map(k => {
      const role = dept.roles?.find(r => r.id === k.role);
      return `- ${k.label} (${role?.label}): ${k.aiImpact}, effort ${k.effort}/10${k.costPerYear ? `, cost ${k.costPerYear}` : ""}${k.valueAtStake ? `, value ${k.valueAtStake}` : ""}`;
    }).join("\n");
  const agents = (dept.agents || [])
    .sort((a, b) => a.priority - b.priority)
    .map(a => `- P${a.priority} ${a.name} (${a.type}, ${a.complexity}): ${a.trigger} → ${a.output}`).join("\n");
  const costSinks = (dept.workflows || []).filter(w => w.valueFlow === "costSink" || w.valueFlow === "valueLeak").map(w => w.label).join(", ");

  return `You are a senior AI transformation consultant. Write an executive briefing report for ${dept.label}.

INSTITUTION DATA:
Label: ${dept.label}${dept.region ? ` | Region: ${dept.region}` : ""}${dept.infrastructure ? ` | Infrastructure: ${dept.infrastructure}` : ""}
Summary: ${dept.summary}
Roles: ${roles}

Highest-effort knowledge work:
${topTasks}

AI agents designed (by priority):
${agents}
${costSinks ? `\nCost sinks / value leaks: ${costSinks}` : ""}

Write a concise executive briefing with EXACTLY these sections (## prefix):

## Executive Summary
2-3 sentences: what this institution does, its primary operational challenge, and the single biggest AI opportunity. Be direct.

## Current State Analysis
3-4 bullet points on the most significant operational bottlenecks, cost concentrations, and workflow inefficiencies — citing specific roles and tasks from the data.

## Top AI Opportunities
The 3 highest-value AI interventions, ranked by impact. For each: name, 1-line description, estimated effort (low/med/high), and projected impact (e.g. "reduces X by Y%"). Be specific.

## Agent Roadmap
Implementation order for the top 3-4 agents from the design. For each: priority number, agent name, build phase (quick win / medium term / strategic), and one key integration needed.

## Infrastructure & Risk
2-3 bullet points on infrastructure constraints, data readiness issues, or change management risks specific to this institution type and region.

## Next Steps
A numbered 3-step action plan to move from prototype to pilot. Concrete and actionable.

Keep the total report under 600 words. Write for a non-technical senior decision-maker.`;
}

export function buildComparePrompt(deptA: Department, deptB: Department): string {
  const summarize = (d: Department) => {
    const roles = (d.roles || []).map(r => r.label).join(", ");
    const tasks = (d.knowledgeWork || []).slice(0, 5).map(k => `${k.label} (${k.aiImpact}, cost: ${k.costPerYear || "?"})`).join("; ");
    const agents = (d.agents || []).map(a => `P${a.priority} ${a.name}`).join(", ");
    return `${d.label}${d.region ? ` · ${d.region}` : ""}${d.infrastructure ? ` · ${d.infrastructure}` : ""}
Summary: ${d.summary}
Roles: ${roles}
Top tasks: ${tasks}
Agents designed: ${agents}`;
  };

  return `You are an expert in institutional operations and AI transformation strategy. Compare these two institutions.

INSTITUTION A:
${summarize(deptA)}

INSTITUTION B:
${summarize(deptB)}

Write a structured comparative analysis using EXACTLY these section headers (use ## prefix):

## Shared Patterns
3-5 bullet points on what both institutions have in common — shared workflows, role types, operational challenges, or AI opportunities.

## Key Differences
3-5 bullet points on what makes each unique — scale, complexity, infrastructure constraints, AI readiness, or team structure.

## AI Readiness
Score each institution 1-10 for AI readiness with a short justification. Identify the biggest gap and what closes it. Note which agents from each design are most transferable to the other.

## Recommended Agents
The top 3 AI agents that would deliver value across BOTH institutions. For each: agent name, one-line trigger, and why it applies to both.

Be specific — reference actual role names, task names, and cost figures from the data above.`;
}

export function buildRefinePrompt(dept: Department, instruction: string): string {
  return `You are an expert in institutional operations and AI transformation strategy. You will refine an existing department schema based on a user instruction.

CURRENT DEPARTMENT DATA:
${JSON.stringify(dept, null, 2)}

USER INSTRUCTION: "${instruction}"

Apply the instruction to transform the department. Update labels, roles, workflows, sensors, knowledgeWork, agents, summary, region, infrastructure, and valueChain as appropriate to reflect the new context.

RULES:
- Preserve role IDs that are referenced in workflows, sensors, and knowledgeWork
- Return ONLY valid JSON matching the exact same schema — no markdown, no explanation, no backticks, no code fences
- Every role id referenced in workflows/sensors/knowledgeWork must exist in the roles array
- roles: x/y positions 10-90, spread across canvas
- Keep the same overall richness (similar counts of roles, workflows, sensors, tasks, agents)`;
}

import { AGENT_TYPES } from "../../data/constants";

export const API_URL = "/api/chat";

export const SYSTEM_PROMPT = `You are an expert in institutional operations, knowledge work analysis, and AI transformation strategy. Your specialty is mapping how organizations actually function — the real flows of work, information, and sensory data — and identifying where AI can create the most leverage.

You must respond ONLY with a single valid JSON object. No markdown, no explanation, no backticks. Pure JSON.

Schema:
{
  "label": "string — short department name",
  "icon": "string — single emoji",
  "color": "string — hex color",
  "accent": "string — slightly darker hex",
  "summary": "string — 2-3 sentences: scale, operational facts, primary pain points with real stats",
  "region": "string — country/region context",
  "infrastructure": "string — one of: high-bandwidth | mobile-first | limited-connectivity | mixed",
  "valueChain": ["string — full flow from intake to outcome"],
  "roles": [{ "id":"snake_case", "label":"Role Title", "icon":"emoji", "x":number_10_to_90, "y":number_15_to_85 }],
  "workflows": [{ "id":"w1", "from":"role_id", "to":"role_id", "label":"what flows", "type":"knowledge|physical", "aiImpact":"high|medium|low", "valueFlow":"valueCreate|costSink|valueLeak|riskNode" }],
  "sensors": [{ "id":"s1", "role":"role_id", "sense":"sight|sound|smell|touch", "label":"what is perceived", "detail":"specific signals", "aiNote":"concrete AI capability with real systems/studies", "icon":"emoji" }],
  "knowledgeWork": [{ "id":"k1", "role":"role_id", "label":"task name", "effort":1_to_10, "frequency":"string", "aiImpact":"supercharge|shortcircuit", "aiNote":"specific AI transformation with real tools/data", "costPerYear":"string", "valueAtStake":"string" }],
  "agents": [{ "id":"a1", "name":"Agent Name", "type":"web|mobile|edge|orch", "taskIds":["k1","s1"], "trigger":"what activates", "output":"what it produces", "humanInLoop":"when human reviews", "integrations":["system1","api2"], "priority":1_to_5, "complexity":"low|medium|high", "mobileFirst":boolean }]
}

Rules:
- roles: 4-6 roles, spread across SVG canvas (x:10-90, y:15-85, no clustering)
- workflows: 5-8 flows between roles
- sensors: 4-7 sensory touchpoints
- knowledgeWork: 6-10 tasks, highest-effort + highest-AI-leverage work
- agents: 4-7 agents, priority 1=build first
- For African/Global South: weight mobile agents, note connectivity constraints, reference local context
- Be specific: name real tools, studies, statistics
- All role ids in workflows/sensors/knowledgeWork must exist in the roles array`;

export function buildSystemPrompt(agent: Agent, dept: Department): string {
  const at = AGENT_TYPES[agent.type] || AGENT_TYPES.web;
  const kw = (agent.taskIds||[]).map(id => (dept.knowledgeWork||[]).find(k=>k.id===id)).filter(Boolean);
  const sens = (agent.taskIds||[]).map(id => (dept.sensors||[]).find(s=>s.id===id)).filter(Boolean);

  const taskBlock = kw.map(k =>
    `- ${k!.label} (${k!.aiImpact === "supercharge" ? "AI-amplified, human reviews" : "AI-autonomous, human handles exceptions"})
   What you know: ${k!.aiNote}
   Economic context: ${k!.costPerYear||"unknown cost"} / Value at stake: ${k!.valueAtStake||"high"}`
  ).join("\n");

  const sensorBlock = sens.map(s =>
    `- ${s!.label} (${s!.sense} sense): ${s!.detail}. AI capability: ${s!.aiNote}`
  ).join("\n");

  return `You are ${agent.name}, an AI agent deployed in a ${dept.label}.

INSTITUTIONAL CONTEXT:
${dept.summary}

YOUR DEPLOYMENT TYPE: ${at.label}
${at.desc}

YOUR TRIGGER: ${agent.trigger}
YOUR OUTPUT: ${agent.output}
HUMAN-IN-LOOP PROTOCOL: ${agent.humanInLoop || "None — you operate autonomously"}
INTEGRATIONS YOU WORK WITH: ${(agent.integrations||[]).join(", ") || "None specified"}
${dept.infrastructure ? `INFRASTRUCTURE CONTEXT: ${dept.infrastructure}` : ""}

TASKS YOU HANDLE:
${taskBlock || "General institutional workflows"}

${sensorBlock ? `SENSORY / DATA INPUTS YOU PROCESS:\n${sensorBlock}` : ""}

BEHAVIOR RULES:
1. Stay in character as ${agent.name}. Do not break from this role.
2. When given inputs matching your trigger, produce output in the format described above.
3. When human review is required per your protocol, explicitly flag it: "⚠️ HUMAN REVIEW NEEDED: [reason]"
4. Use mock/placeholder data when real integrations aren't available — clearly label as [MOCK DATA].
5. Be specific and operational. Do not give generic AI responses. You are a specialized institutional agent.
6. If asked to demonstrate your capabilities, walk through a realistic example scenario for this institution type.
7. Be concise. Institutional agents deliver structured outputs, not essays.`;
}

export function buildScaffold(agent: Agent, dept: Department, systemPrompt: string): string {
  return `// ${agent.name} — Next.js API Route
// Auto-generated by DEPT.OS from agent spec
// Department: ${dept.label}
// Agent type: ${agent.type} | Priority: P${agent.priority} | Complexity: ${agent.complexity}
//
// INTEGRATIONS TO WIRE:
${(agent.integrations||[]).map(i => `//   - ${i}`).join("\n")}

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// System prompt (auto-generated from DEPT.OS spec):
const SYSTEM_PROMPT = \`${systemPrompt.replace(/`/g, "\\`")}\`;

export async function POST(req) {
  const { input } = await req.json();

  // TODO: Fetch real data from integrations before calling the model
  // const integrationData = await fetchFromIntegrations(input);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: input,
        // TODO: Augment with integration data:
        // content: \\\`\\\${input}\\nContext from integrations:\\n\\\${JSON.stringify(integrationData)}\\\`
      }
    ]
  });

  return Response.json({
    output: response.content[0].text,
    agent: "${agent.name}",
    requiresHumanReview: response.content[0].text.includes("⚠️ HUMAN REVIEW NEEDED"),
  });
}`;
}
