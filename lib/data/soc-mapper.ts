import fs from "fs";
import path from "path";

export interface SOCMatch {
  socCode: string;
  title: string;
  confidence: "high" | "medium" | "low";
}

// SOC group labels mapped to department context keywords
const SECTOR_TO_SOC_GROUPS: Record<string, string[]> = {
  hospital: ["Healthcare Practitioners", "Healthcare Support", "Healthcare"],
  clinic: ["Healthcare Practitioners", "Healthcare Support", "Healthcare"],
  health: ["Healthcare Practitioners", "Healthcare Support", "Healthcare"],
  medical: ["Healthcare Practitioners", "Healthcare Support", "Healthcare"],
  physician: ["Healthcare Practitioners"],
  nurse: ["Healthcare Practitioners", "Healthcare Support"],
  pharma: ["Healthcare Practitioners", "Life, Physical, and Social Science"],
  school: ["Educational Instruction", "Education"],
  university: ["Educational Instruction", "Education"],
  education: ["Educational Instruction", "Education"],
  teacher: ["Educational Instruction"],
  college: ["Educational Instruction", "Education"],
  academy: ["Educational Instruction", "Education"],
  police: ["Protective Service"],
  fire: ["Protective Service"],
  dispatch: ["Protective Service", "Office and Administrative Support"],
  emergency: ["Protective Service", "Healthcare Practitioners"],
  water: ["Architecture and Engineering", "Installation, Maintenance, and Repair"],
  utility: ["Architecture and Engineering", "Installation, Maintenance, and Repair"],
  power: ["Architecture and Engineering", "Installation, Maintenance, and Repair"],
  energy: ["Architecture and Engineering", "Life, Physical, and Social Science"],
  transport: ["Transportation and Material Moving"],
  ministry: ["Management", "Office and Administrative Support"],
  department: ["Management", "Office and Administrative Support"],
  agency: ["Management", "Office and Administrative Support"],
  municipal: ["Management", "Office and Administrative Support"],
  government: ["Management", "Office and Administrative Support"],
};

// Load crosswalk lazily (cached after first load)
let crosswalk: Record<
  string,
  { title: string; group: string; keywords: string[] }
> | null = null;

function loadCrosswalk(): Record<
  string,
  { title: string; group: string; keywords: string[] }
> | null {
  if (crosswalk) return crosswalk;
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data/datasets/soc-crosswalk.json"),
      "utf-8"
    );
    crosswalk = JSON.parse(raw).data;
    return crosswalk;
  } catch (err) {
    console.warn("[soc-mapper] Failed to load soc-crosswalk.json:", err);
    return null;
  }
}

/**
 * Tokenize a string into lowercase words, stripping non-alphanumeric chars.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Compute a token overlap score between two token arrays.
 * Returns a number between 0 and 1.
 */
function tokenOverlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let matches = 0;
  for (const token of a) {
    if (setB.has(token)) matches++;
  }
  // Normalize by the smaller set so short role labels can still match well
  return matches / Math.min(a.length, b.length);
}

/**
 * Determine which SOC groups are preferred given a department context string.
 */
function getPreferredGroups(departmentContext: string): Set<string> {
  const groups = new Set<string>();
  const contextLower = departmentContext.toLowerCase();
  for (const [keyword, socGroups] of Object.entries(SECTOR_TO_SOC_GROUPS)) {
    if (contextLower.includes(keyword)) {
      for (const g of socGroups) {
        groups.add(g.toLowerCase());
      }
    }
  }
  return groups;
}

/**
 * Maps a natural language role label to a SOC code using three-tier matching:
 * 1. Exact keyword match
 * 2. Token overlap score
 * 3. Context-aware department sector narrowing
 *
 * Returns null if no good match is found.
 */
export function mapRoleToSOC(
  roleLabel: string,
  departmentContext?: string
): SOCMatch | null {
  const data = loadCrosswalk();
  if (!data) return null;

  const roleTokens = tokenize(roleLabel);
  const roleLower = roleLabel.toLowerCase().trim();

  const preferredGroups = departmentContext
    ? getPreferredGroups(departmentContext)
    : new Set<string>();

  interface Candidate {
    socCode: string;
    title: string;
    score: number;
    confidence: "high" | "medium" | "low";
    groupBoost: boolean;
  }

  const candidates: Candidate[] = [];

  for (const [socCode, entry] of Object.entries(data)) {
    const titleLower = entry.title.toLowerCase();
    const groupLower = (entry.group || "").toLowerCase();
    const keywords = (entry.keywords || []).map((k) => k.toLowerCase());

    // Check if this SOC's group is in the preferred groups for context boost
    const groupBoost =
      preferredGroups.size > 0 &&
      Array.from(preferredGroups).some(
        (pg) => groupLower.includes(pg) || pg.includes(groupLower)
      );

    // --- Tier 1: Exact keyword match ---
    const exactKeywordMatch = keywords.some((kw) => kw === roleLower);
    if (exactKeywordMatch) {
      candidates.push({
        socCode,
        title: entry.title,
        score: 1.0,
        confidence: "high",
        groupBoost,
      });
      continue;
    }

    // Check if the role label exactly matches the SOC title
    if (titleLower === roleLower) {
      candidates.push({
        socCode,
        title: entry.title,
        score: 1.0,
        confidence: "high",
        groupBoost,
      });
      continue;
    }

    // --- Tier 2: Token overlap score ---
    const titleTokens = tokenize(entry.title);
    const keywordTokens = keywords.flatMap((kw) => tokenize(kw));
    const allTargetTokens = [...new Set([...titleTokens, ...keywordTokens])];

    const overlapScore = tokenOverlapScore(roleTokens, allTargetTokens);

    if (overlapScore >= 0.5) {
      // Check for substring containment as a secondary signal
      const substringMatch =
        titleLower.includes(roleLower) || roleLower.includes(titleLower);
      const adjustedScore = substringMatch
        ? Math.min(overlapScore + 0.2, 1.0)
        : overlapScore;

      const confidence: "high" | "medium" | "low" =
        adjustedScore >= 0.8 ? "high" : adjustedScore >= 0.6 ? "medium" : "low";

      candidates.push({
        socCode,
        title: entry.title,
        score: adjustedScore,
        confidence,
        groupBoost,
      });
    } else if (overlapScore >= 0.3) {
      // Partial overlap — only include if group-boosted
      if (groupBoost) {
        candidates.push({
          socCode,
          title: entry.title,
          score: overlapScore,
          confidence: "low",
          groupBoost,
        });
      }
    }
  }

  if (candidates.length === 0) return null;

  // --- Tier 3: Context-aware ranking ---
  // Sort by: group boost (preferred sector first), then by score descending
  candidates.sort((a, b) => {
    // If one has group boost and other doesn't, prefer boosted
    if (a.groupBoost !== b.groupBoost) return a.groupBoost ? -1 : 1;
    // Otherwise sort by score descending
    return b.score - a.score;
  });

  const best = candidates[0];

  // Promote confidence if group boost applies and score is decent
  let finalConfidence = best.confidence;
  if (best.groupBoost && best.confidence === "low" && best.score >= 0.4) {
    finalConfidence = "medium";
  }

  return {
    socCode: best.socCode,
    title: best.title,
    confidence: finalConfidence,
  };
}
