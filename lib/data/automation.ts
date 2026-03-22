import fs from "fs";
import path from "path";

export interface AutomationScore {
  socCode: string;
  aiExposure: number;
  category: string;
  topExposedTasks: string[];
  source: string;
}

export interface WorkActivity {
  name: string;
  importance: number;
  frequency: number;
}

// Raw types for the dataset files
interface RawBrookingsEntry {
  soc_code?: string;
  occ_code?: string;
  occ_title?: string;
  ai_exposure?: number;
  exposure_score?: number;
  category?: string;
  top_tasks?: string[];
  exposed_tasks?: string[];
  [key: string]: unknown;
}

interface RawOnetActivity {
  soc_code?: string;
  occ_code?: string;
  element_name?: string;
  activity_name?: string;
  name?: string;
  importance?: number | string;
  data_value?: number | string;
  frequency?: number | string;
  level?: number | string;
  [key: string]: unknown;
}

// Cached data stores
let brookingsData: Record<string, RawBrookingsEntry> | null = null;
let onetData: Record<string, RawOnetActivity[]> | null = null;

function loadBrookingsData(): Record<string, RawBrookingsEntry> | null {
  if (brookingsData) return brookingsData;
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data/datasets/brookings-ai-exposure.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const entries: RawBrookingsEntry[] = parsed.data || parsed;

    brookingsData = {};
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const code = entry.soc_code || entry.occ_code || "";
        if (code) {
          brookingsData[code] = entry;
        }
      }
    } else if (typeof entries === "object") {
      brookingsData = entries as Record<string, RawBrookingsEntry>;
    }

    return brookingsData;
  } catch (err) {
    console.warn(
      "[automation] Failed to load brookings-ai-exposure.json:",
      err
    );
    return null;
  }
}

function loadOnetData(): Record<string, RawOnetActivity[]> | null {
  if (onetData) return onetData;
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data/datasets/onet-work-activities.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const entries: RawOnetActivity[] = parsed.data || parsed;

    onetData = {};
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const code = entry.soc_code || entry.occ_code || "";
        if (code) {
          if (!onetData[code]) onetData[code] = [];
          onetData[code].push(entry);
        }
      }
    } else if (typeof entries === "object") {
      // If keyed by SOC code with arrays of activities
      for (const [code, activities] of Object.entries(entries)) {
        if (Array.isArray(activities)) {
          onetData[code] = activities as RawOnetActivity[];
        }
      }
    }

    return onetData;
  } catch (err) {
    console.warn(
      "[automation] Failed to load onet-work-activities.json:",
      err
    );
    return null;
  }
}

/**
 * Categorize AI exposure score into a human-readable category.
 */
function categorize(exposure: number): string {
  if (exposure >= 0.8) return "Very High";
  if (exposure >= 0.6) return "High";
  if (exposure >= 0.4) return "Moderate";
  if (exposure >= 0.2) return "Low";
  return "Very Low";
}

/**
 * Try to find an entry in a dataset, checking exact code,
 * then minor group (XX-XX00), then broad group (XX-X000).
 */
function findBrookingsEntry(
  data: Record<string, RawBrookingsEntry>,
  socCode: string
): RawBrookingsEntry | null {
  if (data[socCode]) return data[socCode];

  // Try with period-delimited format (O*NET uses XX-XXXX.00)
  const dotCode = `${socCode}.00`;
  if (data[dotCode]) return data[dotCode];

  // Try broad group
  const broadCode = socCode.replace(/\d{4}$/, "0000");
  if (data[broadCode]) return data[broadCode];

  const minorCode = socCode.replace(/\d{2}$/, "00");
  if (data[minorCode]) return data[minorCode];

  return null;
}

/**
 * Try to find O*NET work activities for a SOC code.
 */
function findOnetActivities(
  data: Record<string, RawOnetActivity[]>,
  socCode: string
): RawOnetActivity[] | null {
  if (data[socCode]) return data[socCode];

  // O*NET often uses period-delimited codes (e.g., "29-1210.00")
  const dotCode = `${socCode}.00`;
  if (data[dotCode]) return data[dotCode];

  // Try broad/minor groups
  const broadCode = socCode.replace(/\d{4}$/, "0000");
  if (data[broadCode]) return data[broadCode];

  const minorCode = socCode.replace(/\d{2}$/, "00");
  if (data[minorCode]) return data[minorCode];

  return null;
}

/**
 * Get AI automation/exposure score for a SOC code.
 */
export function getAutomationScore(socCode: string): AutomationScore | null {
  const data = loadBrookingsData();
  if (!data) return null;

  const entry = findBrookingsEntry(data, socCode);
  if (!entry) return null;

  const exposure =
    typeof entry.ai_exposure === "number"
      ? entry.ai_exposure
      : typeof entry.exposure_score === "number"
        ? entry.exposure_score
        : 0;

  const tasks = entry.top_tasks || entry.exposed_tasks || [];

  return {
    socCode,
    aiExposure: exposure,
    category: entry.category || categorize(exposure),
    topExposedTasks: tasks.slice(0, 5),
    source: "Brookings AI Exposure Index / O*NET",
  };
}

/**
 * Get O*NET work activities for a SOC code.
 */
export function getWorkActivities(socCode: string): WorkActivity[] | null {
  const data = loadOnetData();
  if (!data) return null;

  const activities = findOnetActivities(data, socCode);
  if (!activities || activities.length === 0) return null;

  return activities
    .map((a) => ({
      name:
        a.element_name || a.activity_name || a.name || "Unknown Activity",
      importance: parseFloat(String(a.importance || a.data_value || 0)),
      frequency: parseFloat(String(a.frequency || a.level || 0)),
    }))
    .filter((a) => a.name !== "Unknown Activity")
    .sort((a, b) => b.importance - a.importance);
}
