#!/usr/bin/env node
/**
 * World Bank Indicators Data Fetcher
 *
 * Fetches key development indicators from the World Bank Open Data API.
 * The API is free and requires no authentication.
 *
 * Usage:
 *   npx tsx scripts/fetch-world-bank.ts
 *
 * Indicators fetched:
 *   - NY.GDP.PCAP.CD     — GDP per capita (current US$)
 *   - SH.XPD.CHEX.GD.ZS  — Current health expenditure (% of GDP)
 *   - SE.XPD.TOTL.GD.ZS  — Government expenditure on education (% of GDP)
 *   - IT.NET.USER.ZS      — Individuals using the Internet (% of population)
 *
 * API docs: https://datahelpdesk.worldbank.org/knowledgebase/topics/125589
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CountryIndicators {
  name: string;
  iso3: string;
  region: string;
  incomeLevel: string;
  gdpPerCapita: number | null;
  healthExpPctGDP: number | null;
  educationExpPctGDP: number | null;
  internetUsersPct: number | null;
  dataYear: Record<string, number>;
}

interface OutputFormat {
  _meta: {
    source: string;
    indicators: string[];
    fetchedAt: string;
    recordCount: number;
  };
  data: Record<string, CountryIndicators>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OUTPUT_DIR = path.join(process.cwd(), "data/datasets");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "world-bank-indicators.json");

const BASE_URL = "https://api.worldbank.org/v2";
const DATE_RANGE = "2018:2023";
const PER_PAGE = 500;

const INDICATORS: Array<{
  id: string;
  key: keyof Pick<
    CountryIndicators,
    "gdpPerCapita" | "healthExpPctGDP" | "educationExpPctGDP" | "internetUsersPct"
  >;
  label: string;
}> = [
  { id: "NY.GDP.PCAP.CD", key: "gdpPerCapita", label: "GDP per capita" },
  { id: "SH.XPD.CHEX.GD.ZS", key: "healthExpPctGDP", label: "Health expenditure (% GDP)" },
  { id: "SE.XPD.TOTL.GD.ZS", key: "educationExpPctGDP", label: "Education expenditure (% GDP)" },
  { id: "IT.NET.USER.ZS", key: "internetUsersPct", label: "Internet users (%)" },
];

// Maximum retries for failed API requests
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
        console.warn(`  Attempt ${attempt}/${retries} failed: ${errMsg}. Retrying in ${RETRY_DELAY_MS}ms...`);
        await sleep(RETRY_DELAY_MS * attempt);
      } else {
        throw new Error(`Failed after ${retries} attempts: ${errMsg}`);
      }
    }
  }
  throw new Error("Unreachable");
}

/**
 * Fetch all pages of a World Bank indicator.
 * The API returns [metadata, data_array] as a 2-element JSON array.
 * Pagination is handled via the "page" query parameter.
 */
async function fetchIndicator(
  indicatorId: string
): Promise<
  Array<{
    country: { id: string; value: string };
    countryiso3code: string;
    date: string;
    value: number | null;
  }>
> {
  const allRecords: Array<{
    country: { id: string; value: string };
    countryiso3code: string;
    date: string;
    value: number | null;
  }> = [];

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${BASE_URL}/country/all/indicator/${indicatorId}?format=json&per_page=${PER_PAGE}&date=${DATE_RANGE}&page=${page}`;
    const result = (await fetchWithRetry(url)) as [
      { page: number; pages: number; total: number },
      Array<{
        country: { id: string; value: string };
        countryiso3code: string;
        date: string;
        value: number | null;
      }> | null
    ];

    if (!result || !Array.isArray(result) || result.length < 2) {
      console.warn(`  Unexpected response format for ${indicatorId} page ${page}`);
      break;
    }

    const [metadata, records] = result;
    totalPages = metadata.pages;

    if (records && Array.isArray(records)) {
      allRecords.push(...records);
    }

    page++;
  }

  return allRecords;
}

/**
 * Fetch country metadata (region, income level) for all countries.
 */
async function fetchCountryMetadata(): Promise<
  Record<string, { region: string; incomeLevel: string }>
> {
  const metadata: Record<string, { region: string; incomeLevel: string }> = {};

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${BASE_URL}/country?format=json&per_page=${PER_PAGE}&page=${page}`;
    const result = (await fetchWithRetry(url)) as [
      { page: number; pages: number },
      Array<{
        id: string;
        iso2Code: string;
        region: { value: string };
        incomeLevel: { value: string };
      }> | null
    ];

    if (!result || result.length < 2 || !result[1]) break;

    const [meta, countries] = result;
    totalPages = meta.pages;

    for (const c of countries) {
      // Skip aggregate regions (they have region "Aggregates")
      if (c.region?.value === "Aggregates") continue;
      metadata[c.id] = {
        region: c.region?.value || "Unknown",
        incomeLevel: c.incomeLevel?.value || "Unknown",
      };
    }

    page++;
  }

  return metadata;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Fetching World Bank indicators...");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Fetch country metadata first
  console.log("\nFetching country metadata...");
  const countryMeta = await fetchCountryMetadata();
  console.log(`  Found ${Object.keys(countryMeta).length} countries`);

  // Build country lookup
  const countries: Record<string, CountryIndicators> = {};

  // Fetch each indicator
  for (const indicator of INDICATORS) {
    console.log(`\nFetching ${indicator.label} (${indicator.id})...`);

    try {
      const records = await fetchIndicator(indicator.id);
      console.log(`  Received ${records.length} data points`);

      // For each country, find the most recent non-null value
      // Group by country first
      const byCountry: Record<
        string,
        Array<{ date: string; value: number | null; name: string; iso3: string }>
      > = {};

      for (const r of records) {
        const countryId = r.country.id;
        // Skip aggregates (no countryiso3code or not in metadata)
        if (!r.countryiso3code || !countryMeta[countryId]) continue;

        if (!byCountry[countryId]) byCountry[countryId] = [];
        byCountry[countryId].push({
          date: r.date,
          value: r.value,
          name: r.country.value,
          iso3: r.countryiso3code,
        });
      }

      // Take most recent non-null value per country
      let matched = 0;
      for (const [countryId, dataPoints] of Object.entries(byCountry)) {
        // Sort by date descending
        dataPoints.sort((a, b) => parseInt(b.date) - parseInt(a.date));
        const latest = dataPoints.find((d) => d.value !== null);
        if (!latest || latest.value === null) continue;

        if (!countries[countryId]) {
          const meta = countryMeta[countryId] || {
            region: "Unknown",
            incomeLevel: "Unknown",
          };
          countries[countryId] = {
            name: latest.name,
            iso3: latest.iso3,
            region: meta.region,
            incomeLevel: meta.incomeLevel,
            gdpPerCapita: null,
            healthExpPctGDP: null,
            educationExpPctGDP: null,
            internetUsersPct: null,
            dataYear: {},
          };
        }

        // Round to reasonable precision
        const rounded = Math.round(latest.value * 100) / 100;
        const country = countries[countryId];
        // Use dynamic key assignment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (country as any)[indicator.key] = rounded;
        country.dataYear[indicator.key] = parseInt(latest.date);
        matched++;
      }

      console.log(`  Matched ${matched} countries with data`);
    } catch (err) {
      console.error(`  ERROR fetching ${indicator.label}:`, err instanceof Error ? err.message : err);
    }
  }

  // Build output keyed by ISO3 code for easier lookup
  const outputData: Record<string, CountryIndicators> = {};
  for (const country of Object.values(countries)) {
    if (country.iso3) {
      outputData[country.iso3] = country;
    }
  }

  const output: OutputFormat = {
    _meta: {
      source: "World Bank Open Data",
      indicators: INDICATORS.map((i) => i.id),
      fetchedAt: new Date().toISOString(),
      recordCount: Object.keys(outputData).length,
    },
    data: outputData,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\nWrote ${Object.keys(outputData).length} countries to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
