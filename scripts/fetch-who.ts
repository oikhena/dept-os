#!/usr/bin/env node
/**
 * WHO Global Health Observatory (GHO) Data Fetcher
 *
 * Fetches health workforce indicators from the WHO GHO API.
 * The API is free and requires no authentication.
 *
 * Usage:
 *   npx tsx scripts/fetch-who.ts
 *
 * Indicators fetched:
 *   - HWF_0001 — Medical doctors (per 10,000 population)
 *   - HWF_0002 — Nursing and midwifery personnel (per 10,000)
 *
 * API docs: https://www.who.int/data/gho/info/gho-odata-api
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CountryHealthWorkers {
  name: string;
  iso3: string;
  doctorsPer10k: number | null;
  nursesPer10k: number | null;
  doctorsYear: number | null;
  nursesYear: number | null;
}

interface OutputFormat {
  _meta: {
    source: string;
    indicators: string[];
    fetchedAt: string;
    recordCount: number;
  };
  data: Record<string, CountryHealthWorkers>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OUTPUT_DIR = path.join(process.cwd(), "data/datasets");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "who-health-workers.json");

const GHO_BASE_URL = "https://ghoapi.azureedge.net/api";

const INDICATORS: Array<{
  id: string;
  key: "doctorsPer10k" | "nursesPer10k";
  yearKey: "doctorsYear" | "nursesYear";
  label: string;
}> = [
  {
    id: "HWF_0001",
    key: "doctorsPer10k",
    yearKey: "doctorsYear",
    label: "Medical doctors (per 10,000 population)",
  },
  {
    id: "HWF_0002",
    key: "nursesPer10k",
    yearKey: "nursesYear",
    label: "Nursing and midwifery personnel (per 10,000)",
  },
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<unknown> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  Fetching: ${url.substring(0, 120)}...`);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (attempt < retries) {
        console.warn(
          `  Attempt ${attempt}/${retries} failed: ${errMsg}. Retrying in ${RETRY_DELAY_MS * attempt}ms...`
        );
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        throw new Error(`Failed after ${retries} attempts: ${errMsg}`);
      }
    }
  }
  throw new Error("Unreachable");
}

// ---------------------------------------------------------------------------
// GHO API Data Structures
// ---------------------------------------------------------------------------

interface GHORecord {
  Id: number;
  IndicatorCode: string;
  SpatialDim: string;       // ISO3 country code
  SpatialDimType: string;   // "COUNTRY", "REGION", etc.
  TimeDim: number;          // Year
  Dim1Type?: string;
  Dim1?: string;
  NumericValue: number | null;
  Value: string;
}

interface GHOResponse {
  value: GHORecord[];
  "@odata.nextLink"?: string;
}

/**
 * Fetch all records for a WHO GHO indicator.
 * Handles OData pagination via @odata.nextLink.
 */
async function fetchGHOIndicator(indicatorId: string): Promise<GHORecord[]> {
  const allRecords: GHORecord[] = [];

  // Filter to country-level data only (SpatialDimType eq 'COUNTRY')
  let url: string | undefined =
    `${GHO_BASE_URL}/${indicatorId}?$filter=SpatialDimType eq 'COUNTRY'`;

  while (url) {
    const result = (await fetchWithRetry(url)) as GHOResponse;

    if (result.value && Array.isArray(result.value)) {
      allRecords.push(...result.value);
    }

    // Follow pagination link if present
    url = result["@odata.nextLink"] || undefined;
  }

  return allRecords;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Fetching WHO Global Health Observatory data...");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const countries: Record<string, CountryHealthWorkers> = {};

  for (const indicator of INDICATORS) {
    console.log(`\nFetching ${indicator.label} (${indicator.id})...`);

    try {
      const records = await fetchGHOIndicator(indicator.id);
      console.log(`  Received ${records.length} data points`);

      // Group by country, find most recent non-null value
      const byCountry: Record<string, GHORecord[]> = {};

      for (const r of records) {
        if (!r.SpatialDim || r.NumericValue === null || r.NumericValue === undefined) continue;
        const iso3 = r.SpatialDim;
        if (!byCountry[iso3]) byCountry[iso3] = [];
        byCountry[iso3].push(r);
      }

      let matched = 0;
      for (const [iso3, dataPoints] of Object.entries(byCountry)) {
        // Sort by year descending
        dataPoints.sort((a, b) => (b.TimeDim || 0) - (a.TimeDim || 0));
        const latest = dataPoints.find((d) => d.NumericValue !== null);
        if (!latest || latest.NumericValue === null) continue;

        if (!countries[iso3]) {
          countries[iso3] = {
            name: "", // Will be populated from API or left as ISO3
            iso3,
            doctorsPer10k: null,
            nursesPer10k: null,
            doctorsYear: null,
            nursesYear: null,
          };
        }

        countries[iso3][indicator.key] =
          Math.round(latest.NumericValue * 100) / 100;
        countries[iso3][indicator.yearKey] = latest.TimeDim;
        matched++;
      }

      console.log(`  Matched ${matched} countries with data`);
    } catch (err) {
      console.error(
        `  ERROR fetching ${indicator.label}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // Try to fetch country names from a separate GHO endpoint
  console.log("\nFetching country names...");
  try {
    const dimResult = (await fetchWithRetry(
      `${GHO_BASE_URL}/DIMENSION/COUNTRY/DimensionValues`
    )) as { value: Array<{ Code: string; Title: string }> };

    if (dimResult.value) {
      for (const entry of dimResult.value) {
        if (countries[entry.Code]) {
          countries[entry.Code].name = entry.Title;
        }
      }
    }
    console.log("  Country names populated");
  } catch (err) {
    console.warn(
      "  Could not fetch country names, using ISO3 codes:",
      err instanceof Error ? err.message : err
    );
    // Fall back to using ISO3 codes as names
    for (const [iso3, country] of Object.entries(countries)) {
      if (!country.name) country.name = iso3;
    }
  }

  // Ensure all countries have a name
  for (const [iso3, country] of Object.entries(countries)) {
    if (!country.name) country.name = iso3;
  }

  const output: OutputFormat = {
    _meta: {
      source: "WHO Global Health Observatory",
      indicators: INDICATORS.map((i) => i.id),
      fetchedAt: new Date().toISOString(),
      recordCount: Object.keys(countries).length,
    },
    data: countries,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(
    `\nWrote ${Object.keys(countries).length} countries to ${OUTPUT_FILE}`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
