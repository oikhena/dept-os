import fs from "fs";
import path from "path";

interface CBSACentroid {
  cbsa_code?: string;
  cbsaCode?: string;
  code?: string;
  title?: string;
  name?: string;
  lat?: number;
  latitude?: number;
  lng?: number;
  lon?: number;
  longitude?: number;
  [key: string]: unknown;
}

// Cached data
let cbsaCentroids: CBSACentroid[] | null = null;

function loadCBSACentroids(): CBSACentroid[] | null {
  if (cbsaCentroids) return cbsaCentroids;
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data/datasets/cbsa-centroids.json"),
      "utf-8"
    );
    const parsed = JSON.parse(raw);
    cbsaCentroids = parsed.data || parsed;
    if (!Array.isArray(cbsaCentroids)) {
      // If it's an object keyed by CBSA code, convert to array
      cbsaCentroids = Object.entries(
        parsed.data || parsed
      ).map(([code, entry]: [string, unknown]) => ({
        ...(entry as CBSACentroid),
        cbsa_code: code,
      }));
    }
    return cbsaCentroids;
  } catch (err) {
    console.warn("[geo] Failed to load cbsa-centroids.json:", err);
    return null;
  }
}

/**
 * Compute Haversine distance between two lat/lng points in kilometers.
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get the latitude from a centroid entry, checking common field names.
 */
function getLat(entry: CBSACentroid): number | null {
  const val = entry.lat ?? entry.latitude;
  return typeof val === "number" ? val : null;
}

/**
 * Get the longitude from a centroid entry, checking common field names.
 */
function getLng(entry: CBSACentroid): number | null {
  const val = entry.lng ?? entry.lon ?? entry.longitude;
  return typeof val === "number" ? val : null;
}

/**
 * Get the CBSA code from a centroid entry, checking common field names.
 */
function getCode(entry: CBSACentroid): string {
  return entry.cbsa_code || entry.cbsaCode || entry.code || "";
}

/**
 * Get the title from a centroid entry, checking common field names.
 */
function getTitle(entry: CBSACentroid): string {
  return entry.title || entry.name || "";
}

/**
 * Find the nearest CBSA (Core-Based Statistical Area) to the given coordinates.
 * Returns null if no centroid is within 100km.
 */
export function coordinatesToCBSA(
  lat: number,
  lng: number
): { cbsaCode: string; title: string } | null {
  const centroids = loadCBSACentroids();
  if (!centroids || centroids.length === 0) return null;

  const MAX_DISTANCE_KM = 100;
  let bestMatch: { cbsaCode: string; title: string; distance: number } | null =
    null;

  for (const centroid of centroids) {
    const cLat = getLat(centroid);
    const cLng = getLng(centroid);
    const code = getCode(centroid);

    if (cLat === null || cLng === null || !code) continue;

    const distance = haversineKm(lat, lng, cLat, cLng);

    if (distance <= MAX_DISTANCE_KM) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = {
          cbsaCode: code,
          title: getTitle(centroid),
          distance,
        };
      }
    }
  }

  if (!bestMatch) return null;

  return {
    cbsaCode: bestMatch.cbsaCode,
    title: bestMatch.title,
  };
}

/**
 * Rough bounding boxes for major countries.
 * Format: [latMin, latMax, lngMin, lngMax]
 */
const COUNTRY_BOUNDING_BOXES: Record<
  string,
  { code: string; bounds: [number, number, number, number] }
> = {
  "United States": { code: "US", bounds: [24.5, 49.5, -125.0, -66.5] },
  Canada: { code: "CA", bounds: [41.7, 83.1, -141.0, -52.6] },
  Mexico: { code: "MX", bounds: [14.5, 32.7, -118.4, -86.7] },
  Brazil: { code: "BR", bounds: [-33.7, 5.3, -73.9, -34.8] },
  Argentina: { code: "AR", bounds: [-55.1, -21.8, -73.6, -53.6] },
  Colombia: { code: "CO", bounds: [-4.2, 13.4, -79.0, -66.9] },
  Peru: { code: "PE", bounds: [-18.4, -0.0, -81.3, -68.7] },
  Chile: { code: "CL", bounds: [-55.9, -17.5, -75.6, -66.4] },
  "United Kingdom": { code: "GB", bounds: [49.9, 60.9, -8.6, 1.8] },
  France: { code: "FR", bounds: [41.3, 51.1, -5.1, 9.6] },
  Germany: { code: "DE", bounds: [47.3, 55.1, 5.9, 15.0] },
  Italy: { code: "IT", bounds: [36.6, 47.1, 6.6, 18.5] },
  Spain: { code: "ES", bounds: [36.0, 43.8, -9.3, 4.3] },
  Netherlands: { code: "NL", bounds: [50.8, 53.5, 3.4, 7.1] },
  Sweden: { code: "SE", bounds: [55.3, 69.1, 11.1, 24.2] },
  Norway: { code: "NO", bounds: [57.9, 71.2, 4.6, 31.1] },
  Poland: { code: "PL", bounds: [49.0, 54.8, 14.1, 24.1] },
  Switzerland: { code: "CH", bounds: [45.8, 47.8, 5.9, 10.5] },
  Austria: { code: "AT", bounds: [46.4, 49.0, 9.5, 17.2] },
  India: { code: "IN", bounds: [6.7, 35.5, 68.2, 97.4] },
  China: { code: "CN", bounds: [18.2, 53.6, 73.5, 134.8] },
  Japan: { code: "JP", bounds: [24.3, 45.6, 122.9, 153.0] },
  "South Korea": { code: "KR", bounds: [33.1, 38.6, 124.6, 131.9] },
  Australia: { code: "AU", bounds: [-43.6, -10.7, 113.2, 153.6] },
  "New Zealand": { code: "NZ", bounds: [-47.3, -34.4, 166.4, 178.6] },
  Nigeria: { code: "NG", bounds: [4.3, 13.9, 2.7, 14.7] },
  "South Africa": { code: "ZA", bounds: [-34.8, -22.1, 16.5, 32.9] },
  Kenya: { code: "KE", bounds: [-4.7, 5.0, 33.9, 41.9] },
  Egypt: { code: "EG", bounds: [22.0, 31.7, 24.7, 36.9] },
  Ethiopia: { code: "ET", bounds: [3.4, 14.9, 33.0, 48.0] },
  Ghana: { code: "GH", bounds: [4.7, 11.2, -3.3, 1.2] },
  Tanzania: { code: "TZ", bounds: [-11.7, -1.0, 29.3, 40.4] },
  "Saudi Arabia": { code: "SA", bounds: [16.4, 32.2, 34.5, 55.7] },
  UAE: { code: "AE", bounds: [22.6, 26.1, 51.6, 56.4] },
  Turkey: { code: "TR", bounds: [35.8, 42.1, 26.0, 44.8] },
  Indonesia: { code: "ID", bounds: [-11.0, 6.1, 95.0, 141.0] },
  Philippines: { code: "PH", bounds: [4.6, 21.1, 116.9, 126.6] },
  Thailand: { code: "TH", bounds: [5.6, 20.5, 97.3, 105.6] },
  Russia: { code: "RU", bounds: [41.2, 81.9, 19.6, 180.0] },
  Israel: { code: "IL", bounds: [29.5, 33.3, 34.3, 35.9] },
  Pakistan: { code: "PK", bounds: [23.7, 37.1, 60.9, 77.8] },
};

/**
 * Determine which country a coordinate falls in using bounding box checks.
 * Returns the ISO 2-letter country code, or null if no match.
 *
 * This is intentionally approximate — it serves as a hint for the lookup layer,
 * not a precise geopolitical boundary check.
 */
export function coordinatesToCountry(
  lat: number,
  lng: number
): string | null {
  // Check smaller / more specific bounding boxes first for better accuracy.
  // Sort by bounding box area (ascending) so smaller countries match before
  // larger ones that may overlap.
  const entries = Object.values(COUNTRY_BOUNDING_BOXES).sort((a, b) => {
    const areaA =
      (a.bounds[1] - a.bounds[0]) * (a.bounds[3] - a.bounds[2]);
    const areaB =
      (b.bounds[1] - b.bounds[0]) * (b.bounds[3] - b.bounds[2]);
    return areaA - areaB;
  });

  for (const { code, bounds } of entries) {
    const [latMin, latMax, lngMin, lngMax] = bounds;

    // Handle Russia's special case (spans across 180th meridian in the east)
    if (code === "RU") {
      if (lat >= latMin && lat <= latMax && lng >= 19.6) {
        return code;
      }
      continue;
    }

    if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
      return code;
    }
  }

  return null;
}
