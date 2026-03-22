#!/usr/bin/env node
/**
 * BLS OEWS (Occupational Employment and Wage Statistics) Data Fetcher
 *
 * Downloads and processes BLS salary data into the JSON format used by the app.
 *
 * Usage:
 *   npx tsx scripts/fetch-bls-oews.ts --demo              # Generate realistic placeholder data
 *   npx tsx scripts/fetch-bls-oews.ts --file path/to/oesm23nat.xlsx  # Parse a downloaded BLS file
 *
 * HOW TO OBTAIN REAL DATA:
 *   1. Go to https://www.bls.gov/oes/tables.htm
 *   2. Under "National", download the "All data" file (e.g. oesm23nat.zip)
 *   3. Extract the zip — you'll get a tab-delimited text file
 *   4. Run: npx tsx scripts/fetch-bls-oews.ts --file path/to/national_M2023_dl.xlsx
 *
 *   For metro-level data:
 *   1. Download the MSA file from the same page
 *   2. Run: npx tsx scripts/fetch-bls-oews.ts --metro path/to/MSA_M2023_dl.xlsx
 *
 * The BLS flat file is tab-delimited with columns including:
 *   OCC_CODE, OCC_TITLE, OCC_GROUP, TOT_EMP, EMP_PRSE, H_MEAN, A_MEAN,
 *   MEAN_PRSE, H_MEDIAN, A_MEDIAN, H_PCT10, H_PCT25, H_PCT75, H_PCT90,
 *   A_PCT10, A_PCT25, A_PCT75, A_PCT90
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseCSV } from "./lib/csv-parser.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OEWSRecord {
  title: string;
  employment: number;
  hourlyMean: number;
  annualMean: number;
  hourlyMedian: number;
  annualMedian: number;
  pct10: number;
  pct25: number;
  pct75: number;
  pct90: number;
}

interface OEWSOutput {
  _meta: {
    source: string;
    version: string;
    fetchedAt: string;
    recordCount: number;
  };
  data: Record<string, OEWSRecord>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OUTPUT_DIR = path.join(process.cwd(), "data/datasets");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "bls-oews-national.json");
const METRO_OUTPUT_DIR = path.join(OUTPUT_DIR, "bls-oews-metro");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a numeric string from BLS data. Returns 0 for non-numeric values like "*" or "**". */
function parseNum(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/,/g, "").trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/** Check if an OCC_CODE is a detailed (6-digit) SOC code like "29-1215" */
function isDetailedSOC(code: string): boolean {
  return /^\d{2}-\d{4}$/.test(code.trim());
}

// ---------------------------------------------------------------------------
// Real data processing
// ---------------------------------------------------------------------------

function processRealFile(filePath: string): OEWSOutput {
  console.log(`Reading BLS file: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(content, { delimiter: "\t" });

  console.log(`Parsed ${rows.length} total rows`);

  const data: Record<string, OEWSRecord> = {};

  for (const row of rows) {
    const occCode = (row["OCC_CODE"] || row["occ_code"] || "").trim();
    const occGroup = (row["OCC_GROUP"] || row["o_group"] || "").trim().toLowerCase();

    // Filter to detailed occupations only (skip "major", "minor", "broad" groups)
    if (!isDetailedSOC(occCode)) continue;
    if (occGroup === "major" || occGroup === "minor" || occGroup === "broad") continue;

    data[occCode] = {
      title: (row["OCC_TITLE"] || row["occ_title"] || "").trim(),
      employment: parseNum(row["TOT_EMP"] || row["tot_emp"]),
      hourlyMean: parseNum(row["H_MEAN"] || row["h_mean"]),
      annualMean: parseNum(row["A_MEAN"] || row["a_mean"]),
      hourlyMedian: parseNum(row["H_MEDIAN"] || row["h_median"]),
      annualMedian: parseNum(row["A_MEDIAN"] || row["a_median"]),
      pct10: parseNum(row["A_PCT10"] || row["a_pct10"]),
      pct25: parseNum(row["A_PCT25"] || row["a_pct25"]),
      pct75: parseNum(row["A_PCT75"] || row["a_pct75"]),
      pct90: parseNum(row["A_PCT90"] || row["a_pct90"]),
    };
  }

  const recordCount = Object.keys(data).length;
  console.log(`Extracted ${recordCount} detailed occupations`);

  return {
    _meta: {
      source: "BLS OEWS",
      version: "May 2023",
      fetchedAt: new Date().toISOString(),
      recordCount,
    },
    data,
  };
}

function processMetroFile(filePath: string): void {
  console.log(`Reading BLS metro file: ${filePath}`);
  const content = fs.readFileSync(filePath, "utf-8");
  const rows = parseCSV(content, { delimiter: "\t" });

  // Group by area code
  const byArea: Record<string, Record<string, OEWSRecord>> = {};

  for (const row of rows) {
    const occCode = (row["OCC_CODE"] || row["occ_code"] || "").trim();
    const areaCode = (row["AREA"] || row["area"] || "").trim();

    if (!isDetailedSOC(occCode)) continue;
    if (!areaCode) continue;

    if (!byArea[areaCode]) byArea[areaCode] = {};

    byArea[areaCode][occCode] = {
      title: (row["OCC_TITLE"] || row["occ_title"] || "").trim(),
      employment: parseNum(row["TOT_EMP"] || row["tot_emp"]),
      hourlyMean: parseNum(row["H_MEAN"] || row["h_mean"]),
      annualMean: parseNum(row["A_MEAN"] || row["a_mean"]),
      hourlyMedian: parseNum(row["H_MEDIAN"] || row["h_median"]),
      annualMedian: parseNum(row["A_MEDIAN"] || row["a_median"]),
      pct10: parseNum(row["A_PCT10"] || row["a_pct10"]),
      pct25: parseNum(row["A_PCT25"] || row["a_pct25"]),
      pct75: parseNum(row["A_PCT75"] || row["a_pct75"]),
      pct90: parseNum(row["A_PCT90"] || row["a_pct90"]),
    };
  }

  fs.mkdirSync(METRO_OUTPUT_DIR, { recursive: true });

  for (const [areaCode, data] of Object.entries(byArea)) {
    const output: OEWSOutput = {
      _meta: {
        source: "BLS OEWS",
        version: "May 2023",
        fetchedAt: new Date().toISOString(),
        recordCount: Object.keys(data).length,
      },
      data,
    };
    const outPath = path.join(METRO_OUTPUT_DIR, `${areaCode}.json`);
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  }

  console.log(`Wrote ${Object.keys(byArea).length} metro area files to ${METRO_OUTPUT_DIR}`);
}

// ---------------------------------------------------------------------------
// Demo data generation
// ---------------------------------------------------------------------------

/**
 * Realistic SOC occupations with salary ranges for demo mode.
 * Covers healthcare, education, protective services, management, IT, engineering,
 * transportation, office/admin, and other major groups relevant to government departments.
 */
const DEMO_OCCUPATIONS: Array<{
  code: string;
  title: string;
  emp: number;
  annualMedian: number;
  spread: number; // how wide the pay range is (multiplier)
}> = [
  // Management (11-xxxx)
  { code: "11-1011", title: "Chief Executives", emp: 200550, annualMedian: 189520, spread: 0.55 },
  { code: "11-1021", title: "General and Operations Managers", emp: 3094700, annualMedian: 101280, spread: 0.50 },
  { code: "11-1031", title: "Legislators", emp: 45310, annualMedian: 41200, spread: 0.60 },
  { code: "11-2021", title: "Marketing Managers", emp: 316800, annualMedian: 140040, spread: 0.45 },
  { code: "11-2022", title: "Sales Managers", emp: 469800, annualMedian: 130600, spread: 0.50 },
  { code: "11-3011", title: "Administrative Services Managers", emp: 324900, annualMedian: 104900, spread: 0.45 },
  { code: "11-3013", title: "Facilities Managers", emp: 116800, annualMedian: 99290, spread: 0.40 },
  { code: "11-3021", title: "Computer and Information Systems Managers", emp: 509100, annualMedian: 164070, spread: 0.40 },
  { code: "11-3031", title: "Financial Managers", emp: 738600, annualMedian: 139790, spread: 0.45 },
  { code: "11-3051", title: "Industrial Production Managers", emp: 195700, annualMedian: 107560, spread: 0.45 },
  { code: "11-3061", title: "Purchasing Managers", emp: 80600, annualMedian: 131350, spread: 0.40 },
  { code: "11-3071", title: "Transportation, Storage, and Distribution Managers", emp: 148800, annualMedian: 99200, spread: 0.45 },
  { code: "11-3111", title: "Compensation and Benefits Managers", emp: 18800, annualMedian: 131280, spread: 0.35 },
  { code: "11-3121", title: "Human Resources Managers", emp: 184800, annualMedian: 130000, spread: 0.40 },
  { code: "11-3131", title: "Training and Development Managers", emp: 41800, annualMedian: 120130, spread: 0.40 },
  { code: "11-9013", title: "Farmers, Ranchers, and Other Agricultural Managers", emp: 7600, annualMedian: 75760, spread: 0.50 },
  { code: "11-9021", title: "Construction Managers", emp: 336800, annualMedian: 104900, spread: 0.50 },
  { code: "11-9032", title: "Education Administrators, Kindergarten through Secondary", emp: 291200, annualMedian: 101320, spread: 0.35 },
  { code: "11-9033", title: "Education Administrators, Postsecondary", emp: 195500, annualMedian: 102610, spread: 0.40 },
  { code: "11-9041", title: "Architectural and Engineering Managers", emp: 198200, annualMedian: 159920, spread: 0.35 },
  { code: "11-9111", title: "Medical and Health Services Managers", emp: 480700, annualMedian: 110680, spread: 0.45 },
  { code: "11-9151", title: "Social and Community Service Managers", emp: 183400, annualMedian: 77030, spread: 0.45 },
  { code: "11-9161", title: "Emergency Management Directors", emp: 11300, annualMedian: 83960, spread: 0.40 },
  { code: "11-9179", title: "Engineering Managers, All Other", emp: 11100, annualMedian: 152150, spread: 0.35 },
  { code: "11-9198", title: "Personal Service Managers, All Other", emp: 298500, annualMedian: 62820, spread: 0.50 },
  { code: "11-9199", title: "Managers, All Other", emp: 646200, annualMedian: 116740, spread: 0.45 },

  // Business and Financial (13-xxxx)
  { code: "13-1041", title: "Compliance Officers", emp: 346800, annualMedian: 75880, spread: 0.45 },
  { code: "13-1071", title: "Human Resources Specialists", emp: 782200, annualMedian: 67650, spread: 0.45 },
  { code: "13-1075", title: "Labor Relations Specialists", emp: 85000, annualMedian: 82010, spread: 0.40 },
  { code: "13-1082", title: "Project Management Specialists", emp: 937600, annualMedian: 98580, spread: 0.45 },
  { code: "13-1111", title: "Management Analysts", emp: 981400, annualMedian: 99410, spread: 0.50 },
  { code: "13-1121", title: "Meeting, Convention, and Event Planners", emp: 140600, annualMedian: 56920, spread: 0.45 },
  { code: "13-1151", title: "Training and Development Specialists", emp: 369800, annualMedian: 64340, spread: 0.45 },
  { code: "13-1161", title: "Market Research Analysts and Marketing Specialists", emp: 792500, annualMedian: 68230, spread: 0.50 },
  { code: "13-2011", title: "Accountants and Auditors", emp: 1456300, annualMedian: 79880, spread: 0.45 },
  { code: "13-2031", title: "Budget Analysts", emp: 61000, annualMedian: 84940, spread: 0.35 },
  { code: "13-2041", title: "Credit Analysts", emp: 72800, annualMedian: 82300, spread: 0.45 },
  { code: "13-2051", title: "Financial and Investment Analysts", emp: 324000, annualMedian: 96220, spread: 0.50 },
  { code: "13-2061", title: "Financial Examiners", emp: 69100, annualMedian: 84300, spread: 0.45 },

  // Computer and Mathematical (15-xxxx)
  { code: "15-1211", title: "Computer Systems Analysts", emp: 538800, annualMedian: 102240, spread: 0.40 },
  { code: "15-1212", title: "Information Security Analysts", emp: 175300, annualMedian: 112000, spread: 0.40 },
  { code: "15-1221", title: "Computer and Information Research Scientists", emp: 36100, annualMedian: 136620, spread: 0.40 },
  { code: "15-1232", title: "Computer User Support Specialists", emp: 696200, annualMedian: 57910, spread: 0.45 },
  { code: "15-1241", title: "Computer Network Architects", emp: 179900, annualMedian: 126900, spread: 0.35 },
  { code: "15-1242", title: "Database Administrators", emp: 148500, annualMedian: 101510, spread: 0.40 },
  { code: "15-1243", title: "Database Architects", emp: 37200, annualMedian: 134870, spread: 0.35 },
  { code: "15-1244", title: "Network and Computer Systems Administrators", emp: 363100, annualMedian: 90520, spread: 0.40 },
  { code: "15-1251", title: "Computer Programmers", emp: 147400, annualMedian: 97800, spread: 0.45 },
  { code: "15-1252", title: "Software Developers", emp: 1795300, annualMedian: 127260, spread: 0.40 },
  { code: "15-1253", title: "Software Quality Assurance Analysts and Testers", emp: 199800, annualMedian: 101800, spread: 0.40 },
  { code: "15-1255", title: "Web and Digital Interface Designers", emp: 96600, annualMedian: 80050, spread: 0.45 },
  { code: "15-1299", title: "Computer Occupations, All Other", emp: 425700, annualMedian: 99680, spread: 0.45 },
  { code: "15-2011", title: "Actuaries", emp: 30200, annualMedian: 120970, spread: 0.40 },
  { code: "15-2021", title: "Mathematicians", emp: 3100, annualMedian: 112110, spread: 0.40 },
  { code: "15-2031", title: "Operations Research Analysts", emp: 117400, annualMedian: 85720, spread: 0.45 },
  { code: "15-2041", title: "Statisticians", emp: 41900, annualMedian: 99960, spread: 0.40 },
  { code: "15-2051", title: "Data Scientists", emp: 192300, annualMedian: 108020, spread: 0.40 },

  // Architecture and Engineering (17-xxxx)
  { code: "17-1011", title: "Architects, Except Landscape and Naval", emp: 131200, annualMedian: 93310, spread: 0.45 },
  { code: "17-1022", title: "Surveyors", emp: 46900, annualMedian: 65590, spread: 0.45 },
  { code: "17-2011", title: "Aerospace Engineers", emp: 147200, annualMedian: 126880, spread: 0.35 },
  { code: "17-2041", title: "Chemical Engineers", emp: 26300, annualMedian: 106260, spread: 0.40 },
  { code: "17-2051", title: "Civil Engineers", emp: 326800, annualMedian: 95890, spread: 0.40 },
  { code: "17-2071", title: "Electrical Engineers", emp: 186500, annualMedian: 104610, spread: 0.40 },
  { code: "17-2081", title: "Environmental Engineers", emp: 50300, annualMedian: 100090, spread: 0.40 },
  { code: "17-2112", title: "Industrial Engineers", emp: 303400, annualMedian: 96350, spread: 0.40 },
  { code: "17-2141", title: "Mechanical Engineers", emp: 299200, annualMedian: 96310, spread: 0.40 },
  { code: "17-2199", title: "Engineers, All Other", emp: 163800, annualMedian: 105300, spread: 0.45 },
  { code: "17-3011", title: "Architectural and Civil Drafters", emp: 75400, annualMedian: 60620, spread: 0.40 },
  { code: "17-3023", title: "Electrical and Electronic Engineering Technologists and Technicians", emp: 122200, annualMedian: 65660, spread: 0.40 },
  { code: "17-3026", title: "Industrial Engineering Technologists and Technicians", emp: 74200, annualMedian: 60860, spread: 0.40 },

  // Life, Physical, and Social Science (19-xxxx)
  { code: "19-1013", title: "Soil and Plant Scientists", emp: 18900, annualMedian: 65060, spread: 0.45 },
  { code: "19-1023", title: "Zoologists and Wildlife Biologists", emp: 19400, annualMedian: 70310, spread: 0.40 },
  { code: "19-1031", title: "Conservation Scientists", emp: 25200, annualMedian: 67200, spread: 0.40 },
  { code: "19-1042", title: "Medical Scientists, Except Epidemiologists", emp: 133700, annualMedian: 99930, spread: 0.50 },
  { code: "19-2031", title: "Chemists", emp: 84000, annualMedian: 84680, spread: 0.45 },
  { code: "19-2041", title: "Environmental Scientists and Specialists", emp: 86100, annualMedian: 78980, spread: 0.40 },
  { code: "19-3011", title: "Economists", emp: 17100, annualMedian: 113940, spread: 0.45 },
  { code: "19-3032", title: "Industrial-Organizational Psychologists", emp: 1100, annualMedian: 113320, spread: 0.40 },
  { code: "19-3034", title: "School Psychologists", emp: 58400, annualMedian: 87550, spread: 0.35 },
  { code: "19-3051", title: "Urban and Regional Planners", emp: 38200, annualMedian: 81800, spread: 0.40 },
  { code: "19-4042", title: "Environmental Science and Protection Technicians", emp: 38200, annualMedian: 51710, spread: 0.45 },
  { code: "19-4071", title: "Forest and Conservation Technicians", emp: 34300, annualMedian: 42100, spread: 0.45 },

  // Community and Social Service (21-xxxx)
  { code: "21-1011", title: "Substance Abuse, Behavioral Disorder, and Mental Health Counselors", emp: 365900, annualMedian: 53710, spread: 0.45 },
  { code: "21-1012", title: "Educational, Guidance, and Career Counselors and Advisors", emp: 333400, annualMedian: 60510, spread: 0.40 },
  { code: "21-1013", title: "Marriage and Family Therapists", emp: 64100, annualMedian: 56570, spread: 0.45 },
  { code: "21-1014", title: "Mental Health Counselors", emp: 168600, annualMedian: 53710, spread: 0.45 },
  { code: "21-1015", title: "Rehabilitation Counselors", emp: 121700, annualMedian: 41980, spread: 0.40 },
  { code: "21-1021", title: "Child, Family, and School Social Workers", emp: 353100, annualMedian: 53940, spread: 0.40 },
  { code: "21-1022", title: "Healthcare Social Workers", emp: 192700, annualMedian: 62940, spread: 0.40 },
  { code: "21-1023", title: "Mental Health and Substance Abuse Social Workers", emp: 138500, annualMedian: 55960, spread: 0.45 },
  { code: "21-1029", title: "Social Workers, All Other", emp: 66500, annualMedian: 64620, spread: 0.40 },
  { code: "21-1091", title: "Health Education Specialists", emp: 57900, annualMedian: 62860, spread: 0.45 },
  { code: "21-1092", title: "Probation Officers and Correctional Treatment Specialists", emp: 91300, annualMedian: 60250, spread: 0.35 },
  { code: "21-1093", title: "Social and Human Service Assistants", emp: 462900, annualMedian: 39860, spread: 0.40 },

  // Legal (23-xxxx)
  { code: "23-1011", title: "Lawyers", emp: 813900, annualMedian: 135740, spread: 0.55 },
  { code: "23-1012", title: "Judicial Law Clerks", emp: 17600, annualMedian: 61950, spread: 0.40 },
  { code: "23-1021", title: "Administrative Law Judges, Adjudicators, and Hearing Officers", emp: 16200, annualMedian: 109060, spread: 0.35 },
  { code: "23-1023", title: "Judges, Magistrate Judges, and Magistrates", emp: 30300, annualMedian: 153070, spread: 0.35 },
  { code: "23-2011", title: "Paralegals and Legal Assistants", emp: 345800, annualMedian: 59200, spread: 0.45 },
  { code: "23-2093", title: "Title Examiners, Abstractors, and Searchers", emp: 60400, annualMedian: 50580, spread: 0.45 },

  // Education (25-xxxx)
  { code: "25-1011", title: "Business Teachers, Postsecondary", emp: 87400, annualMedian: 97110, spread: 0.50 },
  { code: "25-1021", title: "Computer Science Teachers, Postsecondary", emp: 43100, annualMedian: 88700, spread: 0.45 },
  { code: "25-1032", title: "Engineering Teachers, Postsecondary", emp: 39600, annualMedian: 108280, spread: 0.45 },
  { code: "25-1042", title: "Biological Science Teachers, Postsecondary", emp: 59800, annualMedian: 87220, spread: 0.45 },
  { code: "25-1052", title: "Chemistry Teachers, Postsecondary", emp: 24700, annualMedian: 86720, spread: 0.40 },
  { code: "25-1071", title: "Health Specialties Teachers, Postsecondary", emp: 271300, annualMedian: 104870, spread: 0.50 },
  { code: "25-1082", title: "Library Science Teachers, Postsecondary", emp: 5000, annualMedian: 79120, spread: 0.40 },
  { code: "25-2011", title: "Preschool Teachers, Except Special Education", emp: 389800, annualMedian: 37840, spread: 0.45 },
  { code: "25-2012", title: "Kindergarten Teachers, Except Special Education", emp: 131400, annualMedian: 63680, spread: 0.35 },
  { code: "25-2021", title: "Elementary School Teachers, Except Special Education", emp: 1363300, annualMedian: 63670, spread: 0.30 },
  { code: "25-2022", title: "Middle School Teachers, Except Special and Career/Technical Education", emp: 618200, annualMedian: 64290, spread: 0.30 },
  { code: "25-2031", title: "Secondary School Teachers, Except Special and Career/Technical Education", emp: 1047900, annualMedian: 65220, spread: 0.30 },
  { code: "25-2052", title: "Special Education Teachers, Kindergarten and Elementary School", emp: 191100, annualMedian: 64910, spread: 0.30 },
  { code: "25-2057", title: "Special Education Teachers, Middle School", emp: 79700, annualMedian: 64910, spread: 0.30 },
  { code: "25-2058", title: "Special Education Teachers, Secondary School", emp: 133100, annualMedian: 65910, spread: 0.30 },
  { code: "25-2059", title: "Special Education Teachers, All Other", emp: 42000, annualMedian: 65920, spread: 0.35 },
  { code: "25-3011", title: "Adult Basic Education, Adult Secondary Education, and English as a Second Language Instructors", emp: 62700, annualMedian: 59720, spread: 0.45 },
  { code: "25-3021", title: "Self-Enrichment Teachers", emp: 290500, annualMedian: 44850, spread: 0.50 },
  { code: "25-3031", title: "Substitute Teachers, Short-Term", emp: 590000, annualMedian: 34570, spread: 0.40 },
  { code: "25-4011", title: "Archivists", emp: 7300, annualMedian: 61880, spread: 0.45 },
  { code: "25-4022", title: "Librarians and Media Collections Specialists", emp: 138600, annualMedian: 65080, spread: 0.35 },
  { code: "25-9031", title: "Instructional Coordinators", emp: 208500, annualMedian: 66490, spread: 0.40 },
  { code: "25-9044", title: "Teaching Assistants, Postsecondary", emp: 157500, annualMedian: 38180, spread: 0.40 },
  { code: "25-9045", title: "Teaching Assistants, Except Postsecondary", emp: 1355700, annualMedian: 32640, spread: 0.35 },

  // Healthcare Practitioners (29-xxxx)
  { code: "29-1011", title: "Chiropractors", emp: 37200, annualMedian: 75380, spread: 0.50 },
  { code: "29-1021", title: "Dentists, General", emp: 110900, annualMedian: 166300, spread: 0.50 },
  { code: "29-1031", title: "Dietitians and Nutritionists", emp: 77200, annualMedian: 66450, spread: 0.40 },
  { code: "29-1041", title: "Optometrists", emp: 41500, annualMedian: 125590, spread: 0.45 },
  { code: "29-1051", title: "Pharmacists", emp: 322200, annualMedian: 132750, spread: 0.30 },
  { code: "29-1071", title: "Physician Assistants", emp: 148000, annualMedian: 126010, spread: 0.35 },
  { code: "29-1122", title: "Occupational Therapists", emp: 129600, annualMedian: 93680, spread: 0.35 },
  { code: "29-1123", title: "Physical Therapists", emp: 231600, annualMedian: 97720, spread: 0.30 },
  { code: "29-1126", title: "Respiratory Therapists", emp: 136500, annualMedian: 70540, spread: 0.35 },
  { code: "29-1127", title: "Speech-Language Pathologists", emp: 161500, annualMedian: 87150, spread: 0.35 },
  { code: "29-1131", title: "Veterinarians", emp: 86700, annualMedian: 103260, spread: 0.45 },
  { code: "29-1141", title: "Registered Nurses", emp: 3175390, annualMedian: 81220, spread: 0.35 },
  { code: "29-1151", title: "Nurse Anesthetists", emp: 43900, annualMedian: 203090, spread: 0.30 },
  { code: "29-1161", title: "Nurse Midwives", emp: 7100, annualMedian: 120880, spread: 0.35 },
  { code: "29-1171", title: "Nurse Practitioners", emp: 264100, annualMedian: 124680, spread: 0.30 },
  { code: "29-1211", title: "Anesthesiologists", emp: 31700, annualMedian: 302970, spread: 0.30 },
  { code: "29-1215", title: "Family Medicine Physicians", emp: 109370, annualMedian: 229300, spread: 0.30 },
  { code: "29-1216", title: "General Internal Medicine Physicians", emp: 48500, annualMedian: 229300, spread: 0.30 },
  { code: "29-1218", title: "Obstetricians and Gynecologists", emp: 17600, annualMedian: 270000, spread: 0.30 },
  { code: "29-1221", title: "Pediatricians, General", emp: 28700, annualMedian: 198420, spread: 0.30 },
  { code: "29-1223", title: "Psychiatrists", emp: 29400, annualMedian: 247350, spread: 0.30 },
  { code: "29-1228", title: "Physicians, All Other", emp: 362100, annualMedian: 236000, spread: 0.30 },
  { code: "29-1229", title: "Surgeons, All Other", emp: 37200, annualMedian: 297800, spread: 0.25 },
  { code: "29-1241", title: "Ophthalmologists, Except Pediatric", emp: 12800, annualMedian: 265000, spread: 0.30 },
  { code: "29-1248", title: "Orthopedic Surgeons, Except Pediatric", emp: 14100, annualMedian: 306220, spread: 0.25 },
  { code: "29-1292", title: "Dental Hygienists", emp: 193000, annualMedian: 81400, spread: 0.35 },
  { code: "29-2010", title: "Clinical Laboratory Technologists and Technicians", emp: 338400, annualMedian: 57800, spread: 0.40 },
  { code: "29-2032", title: "Diagnostic Medical Sonographers", emp: 76980, annualMedian: 81350, spread: 0.35 },
  { code: "29-2034", title: "Radiologic Technologists and Technicians", emp: 206200, annualMedian: 65140, spread: 0.35 },
  { code: "29-2041", title: "Emergency Medical Technicians", emp: 260600, annualMedian: 38930, spread: 0.45 },
  { code: "29-2042", title: "Paramedics", emp: 65100, annualMedian: 49690, spread: 0.40 },
  { code: "29-2052", title: "Pharmacy Technicians", emp: 443100, annualMedian: 38350, spread: 0.35 },
  { code: "29-2061", title: "Licensed Practical and Licensed Vocational Nurses", emp: 658600, annualMedian: 54620, spread: 0.35 },

  // Healthcare Support (31-xxxx)
  { code: "31-1120", title: "Home Health and Personal Care Aides", emp: 3637700, annualMedian: 33530, spread: 0.35 },
  { code: "31-1131", title: "Nursing Assistants", emp: 1390700, annualMedian: 35760, spread: 0.35 },
  { code: "31-2011", title: "Occupational Therapy Assistants", emp: 44700, annualMedian: 64840, spread: 0.35 },
  { code: "31-2021", title: "Physical Therapist Assistants", emp: 97500, annualMedian: 62690, spread: 0.30 },
  { code: "31-9091", title: "Dental Assistants", emp: 371100, annualMedian: 44820, spread: 0.35 },
  { code: "31-9092", title: "Medical Assistants", emp: 749100, annualMedian: 38270, spread: 0.35 },
  { code: "31-9097", title: "Phlebotomists", emp: 134200, annualMedian: 40580, spread: 0.35 },

  // Protective Service (33-xxxx)
  { code: "33-1011", title: "First-Line Supervisors of Correctional Officers", emp: 45200, annualMedian: 65280, spread: 0.35 },
  { code: "33-1012", title: "First-Line Supervisors of Police and Detectives", emp: 133600, annualMedian: 99330, spread: 0.35 },
  { code: "33-1021", title: "First-Line Supervisors of Firefighting and Prevention Workers", emp: 73900, annualMedian: 83130, spread: 0.35 },
  { code: "33-2011", title: "Firefighters", emp: 327600, annualMedian: 57120, spread: 0.40 },
  { code: "33-2021", title: "Fire Inspectors and Investigators", emp: 14200, annualMedian: 68660, spread: 0.35 },
  { code: "33-3011", title: "Bailiffs", emp: 15900, annualMedian: 48300, spread: 0.35 },
  { code: "33-3012", title: "Correctional Officers and Jailers", emp: 372800, annualMedian: 47920, spread: 0.40 },
  { code: "33-3021", title: "Detectives and Criminal Investigators", emp: 110800, annualMedian: 89300, spread: 0.40 },
  { code: "33-3051", title: "Police and Sheriff's Patrol Officers", emp: 665380, annualMedian: 65790, spread: 0.40 },
  { code: "33-3052", title: "Transit and Railroad Police", emp: 3200, annualMedian: 70410, spread: 0.35 },
  { code: "33-9011", title: "Animal Control Workers", emp: 15400, annualMedian: 42830, spread: 0.40 },
  { code: "33-9032", title: "Security Guards", emp: 1093000, annualMedian: 34750, spread: 0.45 },
  { code: "33-9091", title: "Crossing Guards and Flaggers", emp: 78800, annualMedian: 34400, spread: 0.35 },

  // Food Preparation and Serving (35-xxxx)
  { code: "35-1012", title: "First-Line Supervisors of Food Preparation and Serving Workers", emp: 1096300, annualMedian: 40320, spread: 0.45 },
  { code: "35-2014", title: "Cooks, Restaurant", emp: 1481600, annualMedian: 33150, spread: 0.40 },
  { code: "35-2021", title: "Food Preparation Workers", emp: 991000, annualMedian: 30880, spread: 0.35 },

  // Building and Grounds (37-xxxx)
  { code: "37-1011", title: "First-Line Supervisors of Housekeeping and Janitorial Workers", emp: 275600, annualMedian: 47200, spread: 0.40 },
  { code: "37-1012", title: "First-Line Supervisors of Landscaping, Lawn Service, and Groundskeeping Workers", emp: 123800, annualMedian: 55880, spread: 0.40 },
  { code: "37-2011", title: "Janitors and Cleaners, Except Maids and Housekeeping Cleaners", emp: 2183700, annualMedian: 33380, spread: 0.35 },
  { code: "37-3011", title: "Landscaping and Groundskeeping Workers", emp: 1091200, annualMedian: 36990, spread: 0.40 },
  { code: "37-3013", title: "Tree Trimmers and Pruners", emp: 60100, annualMedian: 46040, spread: 0.40 },

  // Office and Administrative Support (43-xxxx)
  { code: "43-1011", title: "First-Line Supervisors of Office and Administrative Support Workers", emp: 1497300, annualMedian: 62060, spread: 0.40 },
  { code: "43-3011", title: "Bill and Account Collectors", emp: 222400, annualMedian: 41360, spread: 0.40 },
  { code: "43-3021", title: "Billing and Posting Clerks", emp: 515200, annualMedian: 42280, spread: 0.35 },
  { code: "43-3031", title: "Bookkeeping, Accounting, and Auditing Clerks", emp: 1525200, annualMedian: 47440, spread: 0.40 },
  { code: "43-3051", title: "Payroll and Timekeeping Clerks", emp: 156400, annualMedian: 50030, spread: 0.35 },
  { code: "43-3061", title: "Procurement Clerks", emp: 56700, annualMedian: 48910, spread: 0.35 },
  { code: "43-4031", title: "Court, Municipal, and License Clerks", emp: 100400, annualMedian: 43860, spread: 0.35 },
  { code: "43-4051", title: "Customer Service Representatives", emp: 2875100, annualMedian: 39680, spread: 0.40 },
  { code: "43-4061", title: "Eligibility Interviewers, Government Programs", emp: 106400, annualMedian: 49060, spread: 0.30 },
  { code: "43-4071", title: "File Clerks", emp: 84600, annualMedian: 36420, spread: 0.35 },
  { code: "43-4081", title: "Hotel, Motel, and Resort Desk Clerks", emp: 213800, annualMedian: 31420, spread: 0.35 },
  { code: "43-4111", title: "Interviewers, Except Eligibility and Loan", emp: 136700, annualMedian: 39100, spread: 0.35 },
  { code: "43-4121", title: "Library Assistants, Clerical", emp: 90500, annualMedian: 33320, spread: 0.35 },
  { code: "43-4161", title: "Human Resources Assistants, Except Payroll and Timekeeping", emp: 124500, annualMedian: 44070, spread: 0.35 },
  { code: "43-4171", title: "Receptionists and Information Clerks", emp: 1010500, annualMedian: 35760, spread: 0.35 },
  { code: "43-5011", title: "Cargo and Freight Agents", emp: 93200, annualMedian: 47400, spread: 0.40 },
  { code: "43-5021", title: "Couriers and Messengers", emp: 61800, annualMedian: 34450, spread: 0.35 },
  { code: "43-5031", title: "Public Safety Telecommunicators", emp: 96600, annualMedian: 46670, spread: 0.35 },
  { code: "43-5032", title: "Dispatchers, Except Police, Fire, and Ambulance", emp: 199600, annualMedian: 44560, spread: 0.40 },
  { code: "43-5061", title: "Production, Planning, and Expediting Clerks", emp: 401200, annualMedian: 52220, spread: 0.40 },
  { code: "43-6011", title: "Executive Secretaries and Executive Administrative Assistants", emp: 527000, annualMedian: 67740, spread: 0.35 },
  { code: "43-6012", title: "Legal Secretaries and Administrative Assistants", emp: 152200, annualMedian: 50190, spread: 0.35 },
  { code: "43-6013", title: "Medical Secretaries and Administrative Assistants", emp: 559400, annualMedian: 40120, spread: 0.30 },
  { code: "43-6014", title: "Secretaries and Administrative Assistants, Except Legal, Medical, and Executive", emp: 1896700, annualMedian: 43600, spread: 0.35 },
  { code: "43-9061", title: "Office Clerks, General", emp: 2614700, annualMedian: 38480, spread: 0.35 },

  // Construction and Extraction (47-xxxx)
  { code: "47-1011", title: "First-Line Supervisors of Construction Trades and Extraction Workers", emp: 720600, annualMedian: 74180, spread: 0.40 },
  { code: "47-2031", title: "Carpenters", emp: 750700, annualMedian: 56350, spread: 0.45 },
  { code: "47-2061", title: "Construction Laborers", emp: 1282100, annualMedian: 43200, spread: 0.45 },
  { code: "47-2073", title: "Operating Engineers and Other Construction Equipment Operators", emp: 441600, annualMedian: 54710, spread: 0.40 },
  { code: "47-2111", title: "Electricians", emp: 739200, annualMedian: 61590, spread: 0.40 },
  { code: "47-2152", title: "Plumbers, Pipefitters, and Steamfitters", emp: 499900, annualMedian: 60090, spread: 0.40 },
  { code: "47-4011", title: "Construction and Building Inspectors", emp: 122600, annualMedian: 65120, spread: 0.35 },

  // Installation, Maintenance, and Repair (49-xxxx)
  { code: "49-1011", title: "First-Line Supervisors of Mechanics, Installers, and Repairers", emp: 529200, annualMedian: 73510, spread: 0.35 },
  { code: "49-3023", title: "Automotive Service Technicians and Mechanics", emp: 750700, annualMedian: 46880, spread: 0.45 },
  { code: "49-3042", title: "Mobile Heavy Equipment Mechanics, Except Engines", emp: 163100, annualMedian: 59780, spread: 0.35 },
  { code: "49-9021", title: "Heating, Air Conditioning, and Refrigeration Mechanics and Installers", emp: 394400, annualMedian: 53410, spread: 0.40 },
  { code: "49-9041", title: "Industrial Machinery Mechanics", emp: 431700, annualMedian: 59840, spread: 0.35 },
  { code: "49-9042", title: "Maintenance and Repair Workers, General", emp: 1453700, annualMedian: 44840, spread: 0.40 },
  { code: "49-9051", title: "Electrical Power-Line Installers and Repairers", emp: 123600, annualMedian: 82340, spread: 0.35 },
  { code: "49-9052", title: "Telecommunications Line Installers and Repairers", emp: 103300, annualMedian: 63400, spread: 0.35 },
  { code: "49-9071", title: "Maintenance Workers, Machinery", emp: 49300, annualMedian: 48960, spread: 0.35 },

  // Transportation and Material Moving (53-xxxx)
  { code: "53-1041", title: "First-Line Supervisors of Transportation and Material Moving Workers", emp: 286200, annualMedian: 57650, spread: 0.40 },
  { code: "53-1042", title: "First-Line Supervisors of Helpers, Laborers, and Material Movers, Hand", emp: 27100, annualMedian: 49650, spread: 0.40 },
  { code: "53-2011", title: "Airline Pilots, Copilots, and Flight Engineers", emp: 103800, annualMedian: 219140, spread: 0.45 },
  { code: "53-3032", title: "Heavy and Tractor-Trailer Truck Drivers", emp: 2032300, annualMedian: 54320, spread: 0.40 },
  { code: "53-3033", title: "Light Truck Drivers", emp: 1013400, annualMedian: 40410, spread: 0.40 },
  { code: "53-3051", title: "Bus Drivers, School", emp: 335400, annualMedian: 40350, spread: 0.35 },
  { code: "53-3052", title: "Bus Drivers, Transit and Intercity", emp: 175500, annualMedian: 48770, spread: 0.35 },
  { code: "53-3054", title: "Taxi Drivers", emp: 133900, annualMedian: 33530, spread: 0.45 },
  { code: "53-4011", title: "Locomotive Engineers", emp: 35100, annualMedian: 75640, spread: 0.30 },
  { code: "53-4031", title: "Railroad Conductors and Yardmasters", emp: 37300, annualMedian: 71860, spread: 0.30 },
  { code: "53-5021", title: "Captains, Mates, and Pilots of Water Vessels", emp: 32000, annualMedian: 87300, spread: 0.45 },
  { code: "53-6021", title: "Parking Attendants", emp: 97200, annualMedian: 30640, spread: 0.35 },
  { code: "53-7021", title: "Crane and Tower Operators", emp: 54500, annualMedian: 63760, spread: 0.40 },
  { code: "53-7051", title: "Industrial Truck and Tractor Operators", emp: 682600, annualMedian: 40460, spread: 0.35 },
  { code: "53-7062", title: "Laborers and Freight, Stock, and Material Movers, Hand", emp: 2978600, annualMedian: 35830, spread: 0.40 },
];

function generateDemoData(): OEWSOutput {
  console.log("Generating demo BLS OEWS data...");

  const data: Record<string, OEWSRecord> = {};

  for (const occ of DEMO_OCCUPATIONS) {
    const median = occ.annualMedian;
    const spread = occ.spread;

    // Generate realistic percentiles around the median
    const pct10 = Math.round(median * (1 - spread));
    const pct25 = Math.round(median * (1 - spread * 0.5));
    const pct75 = Math.round(median * (1 + spread * 0.5));
    const pct90 = Math.round(median * (1 + spread));

    // Mean is typically slightly above median (right-skewed distribution)
    const annualMean = Math.round(median * 1.05);
    const hourlyMedian = Math.round((median / 2080) * 100) / 100;
    const hourlyMean = Math.round((annualMean / 2080) * 100) / 100;

    data[occ.code] = {
      title: occ.title,
      employment: occ.emp,
      hourlyMean,
      annualMean,
      hourlyMedian,
      annualMedian: median,
      pct10,
      pct25,
      pct75,
      pct90,
    };
  }

  const recordCount = Object.keys(data).length;
  console.log(`Generated ${recordCount} occupation records`);

  return {
    _meta: {
      source: "BLS OEWS",
      version: "May 2023 (demo)",
      fetchedAt: new Date().toISOString(),
      recordCount,
    },
    data,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const isDemo = args.includes("--demo");
  const fileIdx = args.indexOf("--file");
  const metroIdx = args.indexOf("--metro");
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : undefined;
  const metroPath = metroIdx !== -1 ? args[metroIdx + 1] : undefined;

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let output: OEWSOutput;

  if (isDemo) {
    output = generateDemoData();
  } else if (filePath) {
    output = processRealFile(filePath);
  } else {
    console.error(
      "Usage:\n" +
        "  npx tsx scripts/fetch-bls-oews.ts --demo\n" +
        "  npx tsx scripts/fetch-bls-oews.ts --file path/to/national_M2023_dl.txt\n" +
        "  npx tsx scripts/fetch-bls-oews.ts --metro path/to/MSA_M2023_dl.txt\n"
    );
    process.exit(1);
  }

  // Write national output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Wrote ${OUTPUT_FILE}`);

  // Process metro file if provided
  if (metroPath) {
    processMetroFile(metroPath);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
