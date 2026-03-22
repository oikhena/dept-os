import fs from "fs";
import path from "path";

export interface RegionalContext {
  countryCode: string;
  countryName: string;
  gdpPerCapita: number;
  healthExpendPct: number;
  educationExpendPct: number;
  internetPenetration: number;
  healthWorkerDensity?: number;
  source: string;
}

interface RawCountryEntry {
  code?: string;
  iso2?: string;
  iso3?: string;
  country_code?: string;
  name?: string;
  country_name?: string;
  gdp_per_capita?: number | string;
  health_expenditure_pct?: number | string;
  education_expenditure_pct?: number | string;
  internet_penetration?: number | string;
  health_worker_density?: number | string;
  lat_min?: number;
  lat_max?: number;
  lng_min?: number;
  lng_max?: number;
  [key: string]: unknown;
}

// Cached data
let countryData: Record<string, RawCountryEntry> | null = null;
let countryNameIndex: Map<string, string> | null = null; // name -> code

function parseNum(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const num = parseFloat(value.replace(/[,$%]/g, "").trim());
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function loadCountryData(): Record<string, RawCountryEntry> | null {
  if (countryData) return countryData;
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data/datasets/country-codes.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    const entries: RawCountryEntry[] = parsed.data || parsed;

    countryData = {};
    countryNameIndex = new Map();

    if (Array.isArray(entries)) {
      for (const entry of entries) {
        const code =
          entry.code || entry.iso2 || entry.iso3 || entry.country_code || "";
        const name = entry.name || entry.country_name || "";
        if (code) {
          countryData[code.toUpperCase()] = entry;
          if (name) {
            countryNameIndex.set(name.toLowerCase(), code.toUpperCase());
          }
        }
      }
    } else if (typeof entries === "object") {
      for (const [code, entry] of Object.entries(
        entries as Record<string, RawCountryEntry>
      )) {
        countryData[code.toUpperCase()] = entry;
        const name = entry.name || entry.country_name || "";
        if (name) {
          if (!countryNameIndex) countryNameIndex = new Map();
          countryNameIndex.set(name.toLowerCase(), code.toUpperCase());
        }
      }
    }

    return countryData;
  } catch (err) {
    console.warn("[regional] Failed to load country-codes.json:", err);
    return null;
  }
}

function ensureNameIndex(): Map<string, string> {
  if (!countryNameIndex) {
    loadCountryData();
  }
  return countryNameIndex || new Map();
}

/**
 * Get regional economic and development context for a country.
 */
export function getRegionalContext(
  countryCode: string
): RegionalContext | null {
  const data = loadCountryData();
  if (!data) return null;

  const code = countryCode.toUpperCase();
  const entry = data[code];
  if (!entry) return null;

  const name = entry.name || entry.country_name || code;
  const gdp = parseNum(entry.gdp_per_capita);

  // If GDP is 0, the entry probably lacks meaningful data
  if (gdp === 0) return null;

  const result: RegionalContext = {
    countryCode: code,
    countryName: name,
    gdpPerCapita: gdp,
    healthExpendPct: parseNum(entry.health_expenditure_pct),
    educationExpendPct: parseNum(entry.education_expenditure_pct),
    internetPenetration: parseNum(entry.internet_penetration),
    source: "World Bank / WHO 2023",
  };

  const healthWorkerDensity = parseNum(entry.health_worker_density);
  if (healthWorkerDensity > 0) {
    result.healthWorkerDensity = healthWorkerDensity;
  }

  return result;
}

/**
 * Well-known country name aliases and abbreviations.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "US",
  "united states": "US",
  "united states of america": "US",
  america: "US",
  uk: "GB",
  "united kingdom": "GB",
  "great britain": "GB",
  england: "GB",
  uae: "AE",
  "united arab emirates": "AE",
  deutschland: "DE",
  germany: "DE",
  france: "FR",
  china: "CN",
  japan: "JP",
  india: "IN",
  brazil: "BR",
  canada: "CA",
  australia: "AU",
  mexico: "MX",
  nigeria: "NG",
  "south africa": "ZA",
  kenya: "KE",
  ghana: "GH",
  egypt: "EG",
  ethiopia: "ET",
  tanzania: "TZ",
  colombia: "CO",
  argentina: "AR",
  chile: "CL",
  peru: "PE",
  "south korea": "KR",
  korea: "KR",
  indonesia: "ID",
  philippines: "PH",
  vietnam: "VN",
  thailand: "TH",
  malaysia: "MY",
  singapore: "SG",
  pakistan: "PK",
  bangladesh: "BD",
  "saudi arabia": "SA",
  turkey: "TR",
  iran: "IR",
  iraq: "IQ",
  israel: "IL",
  poland: "PL",
  netherlands: "NL",
  sweden: "SE",
  norway: "NO",
  denmark: "DK",
  finland: "FI",
  switzerland: "CH",
  austria: "AT",
  belgium: "BE",
  spain: "ES",
  italy: "IT",
  portugal: "PT",
  ireland: "IE",
  "new zealand": "NZ",
  russia: "RU",
  ukraine: "UA",
  romania: "RO",
  "czech republic": "CZ",
  czechia: "CZ",
  hungary: "HU",
};

/**
 * Simple bounding boxes for coordinate-based country inference.
 * Format: [latMin, latMax, lngMin, lngMax]
 */
const COUNTRY_BOUNDING_BOXES: Record<string, [number, number, number, number]> =
  {
    US: [24.5, 49.5, -125.0, -66.5],
    CA: [41.7, 83.1, -141.0, -52.6],
    MX: [14.5, 32.7, -118.4, -86.7],
    BR: [-33.7, 5.3, -73.9, -34.8],
    AR: [-55.1, -21.8, -73.6, -53.6],
    CO: [-4.2, 13.4, -79.0, -66.9],
    GB: [49.9, 60.9, -8.6, 1.8],
    FR: [41.3, 51.1, -5.1, 9.6],
    DE: [47.3, 55.1, 5.9, 15.0],
    IT: [36.6, 47.1, 6.6, 18.5],
    ES: [36.0, 43.8, -9.3, 4.3],
    PT: [36.8, 42.2, -9.5, -6.2],
    NL: [50.8, 53.5, 3.4, 7.1],
    SE: [55.3, 69.1, 11.1, 24.2],
    NO: [57.9, 71.2, 4.6, 31.1],
    PL: [49.0, 54.8, 14.1, 24.1],
    CH: [45.8, 47.8, 5.9, 10.5],
    AT: [46.4, 49.0, 9.5, 17.2],
    IN: [6.7, 35.5, 68.2, 97.4],
    CN: [18.2, 53.6, 73.5, 134.8],
    JP: [24.3, 45.6, 122.9, 153.0],
    KR: [33.1, 38.6, 124.6, 131.9],
    AU: [-43.6, -10.7, 113.2, 153.6],
    NZ: [-47.3, -34.4, 166.4, 178.6],
    NG: [4.3, 13.9, 2.7, 14.7],
    ZA: [-34.8, -22.1, 16.5, 32.9],
    KE: [-4.7, 5.0, 33.9, 41.9],
    EG: [22.0, 31.7, 24.7, 36.9],
    SA: [16.4, 32.2, 34.5, 55.7],
    AE: [22.6, 26.1, 51.6, 56.4],
    TR: [35.8, 42.1, 26.0, 44.8],
    ID: [-11.0, 6.1, 95.0, 141.0],
    PH: [4.6, 21.1, 116.9, 126.6],
    TH: [5.6, 20.5, 97.3, 105.6],
    SG: [1.2, 1.5, 103.6, 104.0],
    PK: [23.7, 37.1, 60.9, 77.8],
    RU: [41.2, 81.9, 19.6, -169.0],
    IL: [29.5, 33.3, 34.3, 35.9],
    GH: [4.7, 11.2, -3.3, 1.2],
    ET: [3.4, 14.9, 33.0, 48.0],
    TZ: [-11.7, -1.0, 29.3, 40.4],
  };

/**
 * Infer a country code from a region string and/or coordinates.
 *
 * For region strings, checks known aliases and country name matches.
 * For coordinates, checks bounding boxes for ~30 major countries.
 */
export function inferCountryCode(
  region: string,
  coordinates?: { lat: number; lng: number }
): string | null {
  const regionLower = region.toLowerCase().trim();

  // 1. Check known aliases first
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    if (regionLower.includes(alias)) {
      return code;
    }
  }

  // 2. Check against country name index from the dataset
  const nameIndex = ensureNameIndex();
  for (const [name, code] of nameIndex.entries()) {
    if (regionLower.includes(name) || name.includes(regionLower)) {
      return code;
    }
  }

  // 3. If coordinates provided, check bounding boxes
  if (coordinates) {
    const { lat, lng } = coordinates;
    for (const [code, [latMin, latMax, lngMin, lngMax]] of Object.entries(
      COUNTRY_BOUNDING_BOXES
    )) {
      // Handle Russia's wrap-around longitude
      if (code === "RU") {
        if (lat >= latMin && lat <= latMax && (lng >= lngMin || lng <= lngMax)) {
          return code;
        }
        continue;
      }
      if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
        return code;
      }
    }
  }

  return null;
}
