export interface Role {
  id: string;
  label: string;
  x: number;
  y: number;
  icon: string;
}

export interface Workflow {
  id: string;
  from: string;
  to: string;
  label: string;
  type: "knowledge" | "physical";
  aiImpact: "high" | "medium" | "low";
  valueFlow: "valueCreate" | "costSink" | "valueLeak" | "riskNode";
}

export interface Sensor {
  id: string;
  role: string;
  sense: "sight" | "sound" | "smell" | "touch" | "taste";
  label: string;
  detail: string;
  aiNote: string;
  icon: string;
}

export interface KnowledgeWork {
  id: string;
  role: string;
  label: string;
  effort: number;
  frequency: string;
  aiImpact: "supercharge" | "shortcircuit";
  aiNote: string;
  costPerYear?: string;
  valueAtStake?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: "web" | "mobile" | "edge" | "orch";
  taskIds: string[];
  trigger: string;
  output: string;
  humanInLoop?: string;
  integrations?: string[];
  priority: number;
  complexity: "low" | "medium" | "high";
  mobileFirst?: boolean;
}

export interface Department {
  label: string;
  icon: string;
  color: string;
  accent: string;
  summary: string;
  region?: string;
  infrastructure?: "high-bandwidth" | "mobile-first" | "limited-connectivity" | "mixed";
  valueChain?: string[];
  roles: Role[];
  workflows: Workflow[];
  sensors: Sensor[];
  knowledgeWork: KnowledgeWork[];
  agents: Agent[];
  _isCustom?: boolean;
}

export interface Advisor {
  icon: string;
  label: string;
  tab: string;
  filter: string | null;
  color: string;
}

export interface AgentType {
  label: string;
  icon: string;
  color: string;
  desc: string;
}
