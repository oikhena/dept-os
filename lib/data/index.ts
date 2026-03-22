// SOC code mapping
export { mapRoleToSOC } from "./soc-mapper";
export type { SOCMatch } from "./soc-mapper";

// BLS salary lookups
export { getSalary, getSalaryRange } from "./salary";
export type { SalaryData, SalaryRange } from "./salary";

// AI automation / O*NET lookups
export { getAutomationScore, getWorkActivities } from "./automation";
export type { AutomationScore, WorkActivity } from "./automation";

// Regional context (World Bank / WHO)
export { getRegionalContext, inferCountryCode } from "./regional";
export type { RegionalContext } from "./regional";

// Cost of failure (AHRQ / CMS)
export { getFailureCosts, getHealthcareAdverseEventCost } from "./cost-of-failure";
export type { FailureCost } from "./cost-of-failure";

// Geo lookups (coordinates to CBSA / country)
export { coordinatesToCBSA, coordinatesToCountry } from "./geo";

// Composite data context builder
export { buildDataContext } from "./context-builder";
export type { DataContext } from "./context-builder";

// Data quality confidence assessment
export { assessConfidence } from "./confidence";
export type { DataConfidence } from "./confidence";
