import type { DataContext } from "./context-builder";

export interface DataConfidence {
  overall: "high" | "medium" | "low" | "none";
  salary: boolean;
  automation: boolean;
  regional: boolean;
  failureCost: boolean;
  unmappedRoles: string[];
}

/**
 * Assess the quality/completeness of a data context.
 *
 * Returns a confidence assessment indicating which data sources were
 * available and which roles couldn't be mapped to SOC codes.
 */
export function assessConfidence(context: DataContext): DataConfidence {
  const hasSalary = Object.keys(context.salary).length > 0;
  const hasAutomation = Object.keys(context.automation).length > 0;
  const hasRegional = context.regional !== null;
  const hasFailureCost = context.failureCosts.length > 0;

  // Identify roles in salary data that are missing automation data, and vice versa
  const salaryRoles = new Set(Object.keys(context.salary));
  const automationRoles = new Set(Object.keys(context.automation));
  const allRoles = new Set([...salaryRoles, ...automationRoles]);

  const unmappedRoles: string[] = [];
  // Roles that appear in one dataset but not the other indicate partial mapping
  for (const role of allRoles) {
    if (!salaryRoles.has(role) && automationRoles.has(role)) {
      unmappedRoles.push(`${role} (missing salary)`);
    } else if (salaryRoles.has(role) && !automationRoles.has(role)) {
      unmappedRoles.push(`${role} (missing automation)`);
    }
  }

  // Calculate overall confidence
  const signals = [hasSalary, hasAutomation, hasRegional, hasFailureCost];
  const trueCount = signals.filter(Boolean).length;

  let overall: "high" | "medium" | "low" | "none";
  if (trueCount >= 3) {
    overall = "high";
  } else if (trueCount === 2) {
    overall = "medium";
  } else if (trueCount === 1) {
    overall = "low";
  } else {
    overall = "none";
  }

  // Degrade confidence if too many roles are unmapped
  if (overall === "high" && unmappedRoles.length > allRoles.size * 0.5) {
    overall = "medium";
  }

  return {
    overall,
    salary: hasSalary,
    automation: hasAutomation,
    regional: hasRegional,
    failureCost: hasFailureCost,
    unmappedRoles,
  };
}
