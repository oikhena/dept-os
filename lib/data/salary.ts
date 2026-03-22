import fs from "fs";
import path from "path";

export interface SalaryData {
  annualMedian: number;
  annualMean: number;
  hourlyMedian: number;
  employment: number;
  source: string;
  socCode: string;
  areaTitle?: string;
}

export interface SalaryRange {
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
}

interface RawSalaryEntry {
  occ_code?: string;
  soc_code?: string;
  occ_title?: string;
  a_median?: number | string;
  a_mean?: number | string;
  h_median?: number | string;
  tot_emp?: number | string;
  a_pct10?: number | string;
  a_pct25?: number | string;
  a_pct75?: number | string;
  a_pct90?: number | string;
  area_title?: string;
  [key: string]: unknown;
}

// Cached data stores
let nationalData: Record<string, RawSalaryEntry> | null = null;
let metroDataCache: Record<string, Record<string, RawSalaryEntry>> = {};
let metroDirectoryExists: boolean | null = null;

function parseNumeric(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // BLS sometimes uses "*" or "#" for unavailable data
    const cleaned = value.replace(/[,$*#]/g, "").trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function loadNationalData(): Record<string, RawSalaryEntry> | null {
  if (nationalData) return nationalData;
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data/datasets/bls-oews-national.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const entries: RawSalaryEntry[] = parsed.data || parsed;

    nationalData = {};
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const code = entry.occ_code || entry.soc_code || "";
        if (code) {
          nationalData[code] = entry;
        }
      }
    } else if (typeof entries === "object") {
      // If data is already keyed by SOC code
      nationalData = entries as Record<string, RawSalaryEntry>;
    }

    return nationalData;
  } catch (err) {
    console.warn("[salary] Failed to load bls-oews-national.json:", err);
    return null;
  }
}

function checkMetroDirectory(): boolean {
  if (metroDirectoryExists !== null) return metroDirectoryExists;
  try {
    const metroPath = path.join(process.cwd(), "data/datasets/bls-oews-metro");
    metroDirectoryExists = fs.existsSync(metroPath) && fs.statSync(metroPath).isDirectory();
  } catch {
    metroDirectoryExists = false;
  }
  return metroDirectoryExists;
}

function loadMetroData(cbsaCode: string): Record<string, RawSalaryEntry> | null {
  if (metroDataCache[cbsaCode]) return metroDataCache[cbsaCode];
  if (!checkMetroDirectory()) return null;

  try {
    const filePath = path.join(
      process.cwd(),
      `data/datasets/bls-oews-metro/${cbsaCode}.json`
    );
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const entries: RawSalaryEntry[] = parsed.data || parsed;

    const result: Record<string, RawSalaryEntry> = {};
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const code = entry.occ_code || entry.soc_code || "";
        if (code) {
          result[code] = entry;
        }
      }
    } else if (typeof entries === "object") {
      Object.assign(result, entries);
    }

    metroDataCache[cbsaCode] = result;
    return result;
  } catch {
    // Metro file not found — this is expected for many CBSA codes
    return null;
  }
}

/**
 * Look up a SOC code in a salary dataset, trying both the exact code
 * and the broad group (e.g., "29-1210" -> "29-1000").
 */
function findEntry(
  data: Record<string, RawSalaryEntry>,
  socCode: string
): RawSalaryEntry | null {
  // Try exact match first
  if (data[socCode]) return data[socCode];

  // Try broad occupation group (replace last 4 digits with "0000")
  const broadCode = socCode.replace(/\d{4}$/, "0000");
  if (data[broadCode]) return data[broadCode];

  // Try minor group (replace last 2 digits with "00")
  const minorCode = socCode.replace(/\d{2}$/, "00");
  if (data[minorCode]) return data[minorCode];

  return null;
}

/**
 * Get salary data for a SOC code, optionally for a specific metro area (CBSA code).
 * Falls back to national data if metro data is unavailable.
 */
export function getSalary(
  socCode: string,
  cbsaCode?: string
): SalaryData | null {
  // Try metro-level data first if CBSA code is provided
  if (cbsaCode) {
    const metroData = loadMetroData(cbsaCode);
    if (metroData) {
      const entry = findEntry(metroData, socCode);
      if (entry) {
        return {
          annualMedian: parseNumeric(entry.a_median),
          annualMean: parseNumeric(entry.a_mean),
          hourlyMedian: parseNumeric(entry.h_median),
          employment: parseNumeric(entry.tot_emp),
          source: `BLS OEWS May 2024, ${entry.area_title || `CBSA ${cbsaCode}`}`,
          socCode,
          areaTitle: entry.area_title,
        };
      }
    }
  }

  // Fall back to national data
  const data = loadNationalData();
  if (!data) return null;

  const entry = findEntry(data, socCode);
  if (!entry) return null;

  return {
    annualMedian: parseNumeric(entry.a_median),
    annualMean: parseNumeric(entry.a_mean),
    hourlyMedian: parseNumeric(entry.h_median),
    employment: parseNumeric(entry.tot_emp),
    source: "BLS OEWS May 2024, National",
    socCode,
    areaTitle: entry.area_title || "National",
  };
}

/**
 * Get the salary percentile range for a SOC code (national data only).
 */
export function getSalaryRange(socCode: string): SalaryRange | null {
  const data = loadNationalData();
  if (!data) return null;

  const entry = findEntry(data, socCode);
  if (!entry) return null;

  const median = parseNumeric(entry.a_median);
  if (median === 0) return null;

  return {
    p10: parseNumeric(entry.a_pct10),
    p25: parseNumeric(entry.a_pct25),
    median,
    p75: parseNumeric(entry.a_pct75),
    p90: parseNumeric(entry.a_pct90),
  };
}
