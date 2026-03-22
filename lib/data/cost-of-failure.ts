import fs from "fs";
import path from "path";

export interface FailureCost {
  event: string;
  medianCost: number;
  annualIncidence?: string;
  source: string;
}

interface RawFailureCostEntry {
  event?: string;
  event_type?: string;
  name?: string;
  median_cost?: number | string;
  cost?: number | string;
  annual_incidence?: string;
  incidence?: string;
  source?: string;
  sector?: string;
  category?: string;
  [key: string]: unknown;
}

// Cached data
let failureCostData: Record<string, RawFailureCostEntry[]> | null = null;

function parseNum(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = parseFloat(value.replace(/[,$]/g, "").trim());
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function loadFailureCostData(): Record<string, RawFailureCostEntry[]> | null {
  if (failureCostData) return failureCostData;
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data/datasets/ahrq-cost-per-event.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const entries = parsed.data || parsed;

    failureCostData = {};

    if (Array.isArray(entries)) {
      // Group by sector
      for (const entry of entries) {
        const sector = (
          entry.sector ||
          entry.category ||
          "general"
        )
          .toLowerCase()
          .trim();
        if (!failureCostData[sector]) {
          failureCostData[sector] = [];
        }
        failureCostData[sector].push(entry);
      }
    } else if (typeof entries === "object") {
      // Already keyed by sector
      for (const [sector, items] of Object.entries(entries)) {
        if (Array.isArray(items)) {
          failureCostData[sector.toLowerCase()] =
            items as RawFailureCostEntry[];
        }
      }
    }

    return failureCostData;
  } catch (err) {
    console.warn(
      "[cost-of-failure] Failed to load ahrq-cost-per-event.json:",
      err
    );
    return null;
  }
}

function mapEntryToFailureCost(entry: RawFailureCostEntry): FailureCost {
  const cost: FailureCost = {
    event: entry.event || entry.event_type || entry.name || "Unknown Event",
    medianCost: parseNum(entry.median_cost || entry.cost),
    source: entry.source || "AHRQ / CMS",
  };

  const incidence = entry.annual_incidence || entry.incidence;
  if (incidence) {
    cost.annualIncidence = incidence;
  }

  return cost;
}

/**
 * Sector name normalization — maps common inputs to canonical sector keys.
 */
const SECTOR_ALIASES: Record<string, string[]> = {
  healthcare: [
    "healthcare",
    "health",
    "hospital",
    "clinic",
    "medical",
    "pharma",
  ],
  education: [
    "education",
    "school",
    "university",
    "college",
    "academy",
    "teaching",
  ],
  infrastructure: [
    "infrastructure",
    "water",
    "utility",
    "power",
    "energy",
    "transport",
    "road",
    "bridge",
    "sewage",
  ],
  public_safety: [
    "public_safety",
    "public safety",
    "police",
    "fire",
    "dispatch",
    "emergency",
    "911",
    "ems",
    "court",
    "law enforcement",
  ],
  government: [
    "government",
    "ministry",
    "department",
    "agency",
    "municipal",
    "city hall",
    "permit",
    "civic",
  ],
};

function normalizeSector(sector: string): string {
  const sectorLower = sector.toLowerCase().trim();

  // Direct match
  if (
    [
      "healthcare",
      "education",
      "infrastructure",
      "public_safety",
      "government",
    ].includes(sectorLower)
  ) {
    return sectorLower;
  }

  // Alias search
  for (const [canonical, aliases] of Object.entries(SECTOR_ALIASES)) {
    for (const alias of aliases) {
      if (sectorLower.includes(alias) || alias.includes(sectorLower)) {
        return canonical;
      }
    }
  }

  return sectorLower;
}

/**
 * Get all failure cost data for a given sector.
 * Sector should be one of: "healthcare", "education", "infrastructure",
 * "public_safety", "government".
 * Returns an empty array if no data is available.
 */
export function getFailureCosts(sector: string): FailureCost[] {
  const data = loadFailureCostData();
  if (!data) return [];

  const normalizedSector = normalizeSector(sector);

  const entries = data[normalizedSector];
  if (!entries || entries.length === 0) {
    // Try "general" as fallback
    const generalEntries = data["general"];
    if (generalEntries) {
      return generalEntries.map(mapEntryToFailureCost);
    }
    return [];
  }

  return entries.map(mapEntryToFailureCost);
}

/**
 * Get the cost of a specific healthcare adverse event type.
 * Event types include things like: "medication error", "surgical complication",
 * "hospital-acquired infection", "falls", "pressure ulcer", etc.
 * Returns null if not found.
 */
export function getHealthcareAdverseEventCost(
  eventType: string
): FailureCost | null {
  const data = loadFailureCostData();
  if (!data) return null;

  const eventLower = eventType.toLowerCase().trim();

  // Search healthcare-specific entries
  const healthcareEntries = data["healthcare"] || [];
  const generalEntries = data["general"] || [];
  const allEntries = [...healthcareEntries, ...generalEntries];

  // Exact match on event name
  for (const entry of allEntries) {
    const entryEvent = (
      entry.event ||
      entry.event_type ||
      entry.name ||
      ""
    ).toLowerCase();
    if (entryEvent === eventLower) {
      return mapEntryToFailureCost(entry);
    }
  }

  // Partial/substring match
  for (const entry of allEntries) {
    const entryEvent = (
      entry.event ||
      entry.event_type ||
      entry.name ||
      ""
    ).toLowerCase();
    if (entryEvent.includes(eventLower) || eventLower.includes(entryEvent)) {
      return mapEntryToFailureCost(entry);
    }
  }

  // Token overlap match
  const eventTokens = new Set(
    eventLower.split(/\s+/).filter((t) => t.length > 2)
  );
  let bestMatch: RawFailureCostEntry | null = null;
  let bestOverlap = 0;

  for (const entry of allEntries) {
    const entryEvent = (
      entry.event ||
      entry.event_type ||
      entry.name ||
      ""
    ).toLowerCase();
    const entryTokens = entryEvent.split(/\s+/).filter((t) => t.length > 2);
    let overlap = 0;
    for (const token of entryTokens) {
      if (eventTokens.has(token)) overlap++;
    }
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = entry;
    }
  }

  if (bestMatch && bestOverlap >= 1) {
    return mapEntryToFailureCost(bestMatch);
  }

  return null;
}
