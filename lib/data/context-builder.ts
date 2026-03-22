import type { Citation } from "../../types/department";
import { mapRoleToSOC, type SOCMatch } from "./soc-mapper";
import { getSalary, type SalaryData } from "./salary";
import { getAutomationScore, type AutomationScore } from "./automation";
import { getRegionalContext, inferCountryCode, type RegionalContext } from "./regional";
import { getFailureCosts, type FailureCost } from "./cost-of-failure";
import { coordinatesToCBSA, coordinatesToCountry } from "./geo";

export interface DataContext {
  salary: Record<string, SalaryData>;
  automation: Record<string, AutomationScore>;
  regional: RegionalContext | null;
  failureCosts: FailureCost[];
  citations: Citation[];
}

/**
 * Sector detection keywords. Each sector maps to keywords that may appear
 * in the query string.
 */
const SECTOR_KEYWORDS: Record<string, string[]> = {
  healthcare: [
    "hospital",
    "clinic",
    "health",
    "medical",
    "physician",
    "nurse",
    "pharma",
    "surgery",
    "dental",
    "therapy",
    "diagnostic",
    "patient",
    "icu",
    "emergency room",
  ],
  education: [
    "school",
    "university",
    "education",
    "teacher",
    "student",
    "college",
    "academy",
    "professor",
    "curriculum",
    "classroom",
    "campus",
    "principal",
    "dean",
  ],
  infrastructure: [
    "water",
    "utility",
    "power",
    "energy",
    "transport",
    "road",
    "bridge",
    "sewage",
    "grid",
    "pipeline",
    "electrical",
    "dam",
    "wastewater",
    "sanitation",
  ],
  public_safety: [
    "police",
    "fire",
    "dispatch",
    "emergency",
    "911",
    "ems",
    "court",
    "corrections",
    "paramedic",
    "ambulance",
    "sheriff",
    "rescue",
    "law enforcement",
  ],
  government: [
    "ministry",
    "department",
    "agency",
    "municipal",
    "city hall",
    "permit",
    "regulatory",
    "civil service",
    "public administration",
    "tax",
    "licensing",
    "zoning",
    "clerk",
  ],
};

/**
 * Predicted common roles for each sector. These are used to pre-fetch
 * salary and automation data.
 */
const SECTOR_ROLES: Record<string, string[]> = {
  healthcare: [
    "Physician",
    "Registered Nurse",
    "Pharmacist",
    "Medical Technologist",
    "Health Information Technician",
    "Medical Secretary",
    "Nursing Assistant",
    "Physical Therapist",
    "Radiologic Technologist",
    "Hospital Administrator",
  ],
  education: [
    "Elementary School Teacher",
    "Secondary School Teacher",
    "School Principal",
    "School Counselor",
    "Teaching Assistant",
    "Librarian",
    "Administrative Assistant",
    "Special Education Teacher",
    "Curriculum Coordinator",
    "IT Support Specialist",
  ],
  infrastructure: [
    "Civil Engineer",
    "Water Treatment Operator",
    "Electrical Engineer",
    "Construction Manager",
    "Environmental Engineer",
    "Maintenance Worker",
    "SCADA Operator",
    "GIS Analyst",
    "Safety Inspector",
    "Project Manager",
  ],
  public_safety: [
    "Police Officer",
    "Firefighter",
    "Emergency Dispatcher",
    "Paramedic",
    "Detective",
    "Corrections Officer",
    "Court Clerk",
    "Forensic Scientist",
    "Emergency Management Director",
    "Probation Officer",
  ],
  government: [
    "City Manager",
    "Budget Analyst",
    "Administrative Officer",
    "Permit Coordinator",
    "Public Affairs Specialist",
    "Human Resources Specialist",
    "IT Manager",
    "Procurement Specialist",
    "Policy Analyst",
    "Records Manager",
  ],
};

/**
 * Detect the sector from a query string.
 */
function detectSector(query: string): string | null {
  const queryLower = query.toLowerCase();
  let bestSector: string | null = null;
  let bestCount = 0;

  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    let count = 0;
    for (const keyword of keywords) {
      if (queryLower.includes(keyword)) {
        count++;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      bestSector = sector;
    }
  }

  return bestSector;
}

/**
 * Format a dollar amount for display.
 */
function formatDollars(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${amount.toLocaleString("en-US")}`;
  }
  return `$${amount}`;
}

/**
 * Build a comprehensive data context by looking up external datasets.
 *
 * Takes a query (describing the department/organization) and optional
 * place details (from Google Places or similar), then returns a formatted
 * text block with citation markers and a citation array.
 */
export function buildDataContext(
  query: string,
  placeDetails: {
    lat: number;
    lng: number;
    name?: string;
    types?: string[];
  } | null
): { contextText: string; citations: Citation[]; dataContext: DataContext } {
  const citations: Citation[] = [];
  let citationCounter = { bls: 0, ai: 0, cof: 0, reg: 0 };

  // --- 1. Detect sector ---
  const sector = detectSector(query);

  // --- 2. Resolve geography ---
  let cbsaCode: string | undefined;
  let cbsaTitle: string | undefined;
  let countryCode: string | null = null;

  if (placeDetails) {
    const cbsa = coordinatesToCBSA(placeDetails.lat, placeDetails.lng);
    if (cbsa) {
      cbsaCode = cbsa.cbsaCode;
      cbsaTitle = cbsa.title;
    }
    countryCode = coordinatesToCountry(placeDetails.lat, placeDetails.lng);
  }

  // Also try inferring country from the query text
  if (!countryCode) {
    countryCode = inferCountryCode(
      query,
      placeDetails
        ? { lat: placeDetails.lat, lng: placeDetails.lng }
        : undefined
    );
  }

  // --- 3. Get predicted roles for the sector ---
  const roles = sector ? SECTOR_ROLES[sector] || [] : [];

  // --- 4. Map roles to SOC codes ---
  const socMatches: Record<string, SOCMatch> = {};
  const departmentContext = sector || query;

  for (const role of roles) {
    const match = mapRoleToSOC(role, departmentContext);
    if (match) {
      socMatches[role] = match;
    }
  }

  // --- 5. Fetch salary data ---
  const salaryData: Record<string, SalaryData> = {};
  for (const [role, socMatch] of Object.entries(socMatches)) {
    const salary = getSalary(socMatch.socCode, cbsaCode);
    if (salary) {
      salaryData[role] = salary;
    }
  }

  // --- 6. Fetch automation data ---
  const automationData: Record<string, AutomationScore> = {};
  for (const [role, socMatch] of Object.entries(socMatches)) {
    const automation = getAutomationScore(socMatch.socCode);
    if (automation) {
      automationData[role] = automation;
    }
  }

  // --- 7. Fetch regional context ---
  let regional: RegionalContext | null = null;
  if (countryCode) {
    regional = getRegionalContext(countryCode);
  }

  // --- 8. Fetch failure costs ---
  const failureCosts = sector ? getFailureCosts(sector) : [];

  // --- 9. Build formatted text ---
  const sections: string[] = [];

  sections.push(
    "VERIFIED EXTERNAL DATA \u2014 use these exact figures, cite sources in your JSON output:"
  );
  sections.push("");

  // Salary section
  const salaryEntries = Object.entries(salaryData);
  if (salaryEntries.length > 0) {
    sections.push("SALARY DATA (BLS OEWS May 2024):");
    for (const [role, salary] of salaryEntries) {
      const socMatch = socMatches[role];
      citationCounter.bls++;
      const citId = `bls-${citationCounter.bls}`;
      citations.push({
        id: citId,
        label: `BLS OEWS: ${socMatch?.title || role} (${salary.socCode})`,
        url: `https://www.bls.gov/oes/current/oes${salary.socCode.replace("-", "")}.htm`,
        accessed: "2024-05",
      });

      const areaNote =
        salary.areaTitle && salary.areaTitle !== "National"
          ? `, ${salary.areaTitle}`
          : "";
      sections.push(
        `- ${socMatch?.title || role} (SOC ${salary.socCode}): median ${formatDollars(salary.annualMedian)}/yr${areaNote} [${citId}]`
      );
    }
    sections.push("");
  }

  // Automation section
  const automationEntries = Object.entries(automationData);
  if (automationEntries.length > 0) {
    sections.push("AI AUTOMATION POTENTIAL (Brookings/O*NET):");
    for (const [role, automation] of automationEntries) {
      citationCounter.ai++;
      const citId = `ai-${citationCounter.ai}`;
      citations.push({
        id: citId,
        label: `Brookings AI Exposure: ${role} (${automation.socCode})`,
        url: "https://www.brookings.edu/research/what-jobs-are-affected-by-ai/",
        accessed: "2024",
      });

      const exposurePct = Math.round(automation.aiExposure * 100);
      const tasks =
        automation.topExposedTasks.length > 0
          ? `, top automatable tasks: ${automation.topExposedTasks.slice(0, 3).map((t) => `"${t}"`).join(", ")}`
          : "";
      sections.push(
        `- ${role}: ${exposurePct}% AI exposure (${automation.category})${tasks} [${citId}]`
      );
    }
    sections.push("");
  }

  // Failure cost section
  if (failureCosts.length > 0) {
    sections.push("COST OF FAILURE (AHRQ/CMS):");
    for (const cost of failureCosts.slice(0, 8)) {
      citationCounter.cof++;
      const citId = `cof-${citationCounter.cof}`;
      citations.push({
        id: citId,
        label: `AHRQ: ${cost.event}`,
        url: "https://www.ahrq.gov/data/hcup/index.html",
        accessed: "2024",
      });

      const incidenceNote = cost.annualIncidence
        ? `, ~${cost.annualIncidence} annually`
        : "";
      sections.push(
        `- ${cost.event}: median ${formatDollars(cost.medianCost)} per event${incidenceNote} [${citId}]`
      );
    }
    sections.push("");
  }

  // Regional context section
  if (regional) {
    citationCounter.reg++;
    const citId = `reg-${citationCounter.reg}`;
    citations.push({
      id: citId,
      label: `World Bank / WHO: ${regional.countryName}`,
      url: "https://data.worldbank.org/",
      accessed: "2023",
    });

    sections.push("REGIONAL CONTEXT (World Bank 2023):");
    sections.push(
      `- Country: ${regional.countryName}, GDP/capita: ${formatDollars(regional.gdpPerCapita)}, Health spend: ${regional.healthExpendPct}% GDP [${citId}]`
    );
    if (regional.educationExpendPct > 0) {
      sections.push(
        `- Education spend: ${regional.educationExpendPct}% GDP, Internet penetration: ${regional.internetPenetration}%`
      );
    }
    if (regional.healthWorkerDensity) {
      sections.push(
        `- Health worker density: ${regional.healthWorkerDensity} per 10,000 population`
      );
    }
    if (cbsaTitle) {
      sections.push(`- Metro area: ${cbsaTitle}`);
    }
    sections.push("");
  }

  // If we have no data at all, return a minimal message
  if (
    salaryEntries.length === 0 &&
    automationEntries.length === 0 &&
    failureCosts.length === 0 &&
    !regional
  ) {
    sections.length = 0;
    sections.push(
      "NO VERIFIED EXTERNAL DATA AVAILABLE for this query. Use reasonable estimates and note the lack of verified data sources."
    );
  }

  const dataContext: DataContext = {
    salary: salaryData,
    automation: automationData,
    regional,
    failureCosts,
    citations,
  };

  return {
    contextText: sections.join("\n"),
    citations,
    dataContext,
  };
}
