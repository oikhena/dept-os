#!/usr/bin/env node
/**
 * O*NET Work Activities and Automation Scores Fetcher
 *
 * Downloads and processes O*NET database files into the JSON format used by the app.
 *
 * Usage:
 *   npx tsx scripts/fetch-onet.ts --demo                    # Generate realistic placeholder data
 *   npx tsx scripts/fetch-onet.ts --dir path/to/onet_db/    # Parse extracted O*NET database files
 *
 * HOW TO OBTAIN REAL DATA:
 *   1. Go to https://www.onetcenter.org/database.html
 *   2. Download the "Database" file (e.g. db_29_0_text.zip)
 *   3. Extract the zip — you'll get a folder with many .txt files
 *   4. Run: npx tsx scripts/fetch-onet.ts --dir path/to/db_29_0_text/
 *
 * Relevant files inside the O*NET database zip:
 *   - Work Activities.txt — tab-delimited columns:
 *       O*NET-SOC Code, Element ID, Element Name, Scale ID, Data Value, ...
 *   - Task Statements.txt — tab-delimited columns:
 *       O*NET-SOC Code, Task ID, Task, Task Type, ...
 *
 * The script filters Work Activities to Scale ID = "IM" (Importance) and "LV" (Level),
 * groups by SOC code, and computes automation potential scores based on activity profiles.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parseCSV } from "./lib/csv-parser.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkActivity {
  name: string;
  importance: number;
  frequency: number;
}

interface OccupationActivities {
  activities: WorkActivity[];
}

interface AutomationScore {
  automationPotential: number;
  topAutomatableTasks: string[];
  topHumanTasks: string[];
}

interface WorkActivitiesOutput {
  _meta: { source: string; version: string; recordCount: number };
  data: Record<string, OccupationActivities>;
}

interface AutomationScoresOutput {
  _meta: { source: string; version: string };
  data: Record<string, AutomationScore>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OUTPUT_DIR = path.join(process.cwd(), "data/datasets");
const ACTIVITIES_OUTPUT = path.join(OUTPUT_DIR, "onet-work-activities.json");
const AUTOMATION_OUTPUT = path.join(OUTPUT_DIR, "onet-automation-scores.json");

/**
 * Activities ranked by how automatable they are (higher = more automatable).
 * Based on analysis of Brookings Institution AI exposure research and
 * common AI/automation capability assessments.
 */
const AUTOMATION_RANKINGS: Record<string, number> = {
  // Highly automatable (0.7–1.0)
  "Processing Information": 0.92,
  "Analyzing Data or Information": 0.88,
  "Documenting/Recording Information": 0.87,
  "Getting Information": 0.82,
  "Identifying Objects, Actions, and Events": 0.80,
  "Evaluating Information to Determine Compliance with Standards": 0.78,
  "Updating and Using Relevant Knowledge": 0.77,
  "Scheduling Work and Activities": 0.76,
  "Estimating the Quantifiable Characteristics of Products, Events, or Information": 0.75,
  "Monitor Processes, Materials, or Surroundings": 0.73,
  "Organizing, Planning, and Prioritizing Work": 0.70,

  // Moderately automatable (0.4–0.7)
  "Interacting With Computers": 0.68,
  "Interpreting the Meaning of Information for Others": 0.62,
  "Judging the Qualities of Objects, Services, or People": 0.58,
  "Communicating with Supervisors, Peers, or Subordinates": 0.52,
  "Communicating with People Outside the Organization": 0.50,
  "Providing Consultation and Advice to Others": 0.48,
  "Developing Objectives and Strategies": 0.47,
  "Inspecting Equipment, Structures, or Materials": 0.45,
  "Drafting, Laying Out, and Specifying Technical Devices, Parts, and Equipment": 0.44,
  "Thinking Creatively": 0.42,
  "Making Decisions and Solving Problems": 0.40,

  // Difficult to automate (0.1–0.4)
  "Establishing and Maintaining Interpersonal Relationships": 0.35,
  "Resolving Conflicts and Negotiating with Others": 0.30,
  "Coordinating the Work and Activities of Others": 0.32,
  "Developing and Building Teams": 0.28,
  "Training and Teaching Others": 0.27,
  "Coaching and Developing Others": 0.25,
  "Guiding, Directing, and Motivating Subordinates": 0.24,
  "Staffing Organizational Units": 0.30,
  "Monitoring and Controlling Resources": 0.38,
  "Performing Administrative Activities": 0.55,
  "Selling or Influencing Others": 0.33,

  // Very difficult to automate (0.0–0.2)
  "Performing General Physical Activities": 0.18,
  "Handling and Moving Objects": 0.20,
  "Controlling Machines and Processes": 0.22,
  "Operating Vehicles, Mechanized Devices, or Equipment": 0.15,
  "Performing for or Working Directly with the Public": 0.22,
  "Assisting and Caring for Others": 0.12,
  "Repairing and Maintaining Mechanical Equipment": 0.18,
  "Repairing and Maintaining Electronic Equipment": 0.20,
};

// ---------------------------------------------------------------------------
// Real data processing
// ---------------------------------------------------------------------------

function toSixDigitSOC(onetCode: string): string {
  // O*NET codes look like "29-1215.00" — strip the suffix
  return onetCode.replace(/\.\d+$/, "").trim();
}

function processRealData(dirPath: string): {
  activities: WorkActivitiesOutput;
  automation: AutomationScoresOutput;
} {
  const activitiesFile = path.join(dirPath, "Work Activities.txt");
  if (!fs.existsSync(activitiesFile)) {
    throw new Error(`File not found: ${activitiesFile}`);
  }

  console.log(`Reading ${activitiesFile}...`);
  const content = fs.readFileSync(activitiesFile, "utf-8");
  const rows = parseCSV(content, { delimiter: "\t" });
  console.log(`Parsed ${rows.length} rows from Work Activities`);

  // Collect importance (IM) and level (LV) values grouped by SOC code + activity
  const collected: Record<
    string,
    Record<string, { importance: number; level: number }>
  > = {};

  for (const row of rows) {
    const onetCode = row["O*NET-SOC Code"] || "";
    const scaleId = (row["Scale ID"] || "").trim();
    const elementName = (row["Element Name"] || "").trim();
    const dataValue = parseFloat(row["Data Value"] || "0");

    if (!onetCode || !elementName) continue;
    if (scaleId !== "IM" && scaleId !== "LV") continue;

    const socCode = toSixDigitSOC(onetCode);
    if (!collected[socCode]) collected[socCode] = {};
    if (!collected[socCode][elementName]) {
      collected[socCode][elementName] = { importance: 0, level: 0 };
    }

    if (scaleId === "IM") {
      collected[socCode][elementName].importance = dataValue;
    } else {
      // Use LV (level) as a proxy for frequency
      collected[socCode][elementName].level = dataValue;
    }
  }

  // Build activities output
  const activitiesData: Record<string, OccupationActivities> = {};
  for (const [socCode, acts] of Object.entries(collected)) {
    const activities: WorkActivity[] = Object.entries(acts)
      .map(([name, vals]) => ({
        name,
        importance: Math.round(vals.importance * 100) / 100,
        frequency: Math.round(vals.level * 100) / 100,
      }))
      .sort((a, b) => b.importance - a.importance);

    activitiesData[socCode] = { activities };
  }

  // Build automation scores
  const automationData: Record<string, AutomationScore> = {};
  for (const [socCode, acts] of Object.entries(collected)) {
    const entries = Object.entries(acts);
    let weightedSum = 0;
    let totalWeight = 0;

    const scored: Array<{ name: string; autoScore: number; importance: number }> = [];

    for (const [name, vals] of entries) {
      const autoRank = AUTOMATION_RANKINGS[name] ?? 0.5;
      const weight = vals.importance;
      weightedSum += autoRank * weight;
      totalWeight += weight;
      scored.push({ name, autoScore: autoRank, importance: vals.importance });
    }

    const automationPotential =
      totalWeight > 0
        ? Math.round((weightedSum / totalWeight) * 100) / 100
        : 0.5;

    // Sort by automation score * importance for top lists
    scored.sort((a, b) => b.autoScore * b.importance - a.autoScore * a.importance);
    const topAutomatable = scored.slice(0, 3).map((s) => s.name);

    scored.sort((a, b) => a.autoScore * a.importance - b.autoScore * b.importance);
    const topHuman = scored
      .filter((s) => s.importance >= 3.0)
      .slice(0, 3)
      .map((s) => s.name);

    automationData[socCode] = {
      automationPotential,
      topAutomatableTasks: topAutomatable,
      topHumanTasks: topHuman.length > 0 ? topHuman : scored.slice(0, 3).map((s) => s.name),
    };
  }

  return {
    activities: {
      _meta: {
        source: "O*NET 29.0",
        version: "2024",
        recordCount: Object.keys(activitiesData).length,
      },
      data: activitiesData,
    },
    automation: {
      _meta: { source: "O*NET + Analysis", version: "2024" },
      data: automationData,
    },
  };
}

// ---------------------------------------------------------------------------
// Demo data generation
// ---------------------------------------------------------------------------

/** All 41 O*NET Generalized Work Activities */
const ALL_WORK_ACTIVITIES = [
  "Getting Information",
  "Monitor Processes, Materials, or Surroundings",
  "Identifying Objects, Actions, and Events",
  "Inspecting Equipment, Structures, or Materials",
  "Estimating the Quantifiable Characteristics of Products, Events, or Information",
  "Judging the Qualities of Objects, Services, or People",
  "Processing Information",
  "Evaluating Information to Determine Compliance with Standards",
  "Analyzing Data or Information",
  "Making Decisions and Solving Problems",
  "Thinking Creatively",
  "Updating and Using Relevant Knowledge",
  "Developing Objectives and Strategies",
  "Scheduling Work and Activities",
  "Organizing, Planning, and Prioritizing Work",
  "Performing General Physical Activities",
  "Handling and Moving Objects",
  "Controlling Machines and Processes",
  "Operating Vehicles, Mechanized Devices, or Equipment",
  "Interacting With Computers",
  "Drafting, Laying Out, and Specifying Technical Devices, Parts, and Equipment",
  "Repairing and Maintaining Mechanical Equipment",
  "Repairing and Maintaining Electronic Equipment",
  "Documenting/Recording Information",
  "Interpreting the Meaning of Information for Others",
  "Communicating with Supervisors, Peers, or Subordinates",
  "Communicating with People Outside the Organization",
  "Establishing and Maintaining Interpersonal Relationships",
  "Assisting and Caring for Others",
  "Selling or Influencing Others",
  "Resolving Conflicts and Negotiating with Others",
  "Performing for or Working Directly with the Public",
  "Coordinating the Work and Activities of Others",
  "Developing and Building Teams",
  "Training and Teaching Others",
  "Guiding, Directing, and Motivating Subordinates",
  "Coaching and Developing Others",
  "Providing Consultation and Advice to Others",
  "Performing Administrative Activities",
  "Staffing Organizational Units",
  "Monitoring and Controlling Resources",
];

/**
 * Occupation profiles: define which activities are most/least important.
 * SOC major group -> activity importance bias.
 */
const OCCUPATION_PROFILES: Record<string, Record<string, number>> = {
  "11": {
    // Management
    "Making Decisions and Solving Problems": 4.6,
    "Guiding, Directing, and Motivating Subordinates": 4.4,
    "Developing Objectives and Strategies": 4.3,
    "Communicating with Supervisors, Peers, or Subordinates": 4.5,
    "Organizing, Planning, and Prioritizing Work": 4.5,
    "Coordinating the Work and Activities of Others": 4.3,
    "Monitoring and Controlling Resources": 4.0,
    "Establishing and Maintaining Interpersonal Relationships": 4.2,
    "Staffing Organizational Units": 3.5,
    "Developing and Building Teams": 3.8,
  },
  "13": {
    // Business and Financial
    "Processing Information": 4.5,
    "Analyzing Data or Information": 4.6,
    "Evaluating Information to Determine Compliance with Standards": 4.3,
    "Documenting/Recording Information": 4.2,
    "Interacting With Computers": 4.4,
    "Making Decisions and Solving Problems": 4.1,
    "Communicating with Supervisors, Peers, or Subordinates": 4.0,
    "Getting Information": 4.3,
    "Organizing, Planning, and Prioritizing Work": 4.1,
    "Updating and Using Relevant Knowledge": 4.0,
  },
  "15": {
    // Computer and Mathematical
    "Interacting With Computers": 4.8,
    "Analyzing Data or Information": 4.5,
    "Processing Information": 4.4,
    "Making Decisions and Solving Problems": 4.3,
    "Thinking Creatively": 4.2,
    "Updating and Using Relevant Knowledge": 4.5,
    "Getting Information": 4.1,
    "Documenting/Recording Information": 3.8,
    "Communicating with Supervisors, Peers, or Subordinates": 3.7,
    "Organizing, Planning, and Prioritizing Work": 3.9,
  },
  "17": {
    // Architecture and Engineering
    "Drafting, Laying Out, and Specifying Technical Devices, Parts, and Equipment": 4.3,
    "Analyzing Data or Information": 4.4,
    "Making Decisions and Solving Problems": 4.2,
    "Interacting With Computers": 4.1,
    "Getting Information": 4.2,
    "Processing Information": 4.0,
    "Evaluating Information to Determine Compliance with Standards": 4.1,
    "Thinking Creatively": 3.8,
    "Documenting/Recording Information": 3.9,
    "Inspecting Equipment, Structures, or Materials": 3.8,
  },
  "19": {
    // Life, Physical, and Social Science
    "Analyzing Data or Information": 4.6,
    "Getting Information": 4.4,
    "Processing Information": 4.3,
    "Updating and Using Relevant Knowledge": 4.5,
    "Documenting/Recording Information": 4.2,
    "Thinking Creatively": 3.9,
    "Making Decisions and Solving Problems": 4.0,
    "Interpreting the Meaning of Information for Others": 4.1,
    "Interacting With Computers": 3.8,
    "Communicating with Supervisors, Peers, or Subordinates": 3.7,
  },
  "21": {
    // Community and Social Service
    "Assisting and Caring for Others": 4.6,
    "Establishing and Maintaining Interpersonal Relationships": 4.5,
    "Making Decisions and Solving Problems": 4.2,
    "Communicating with Supervisors, Peers, or Subordinates": 4.3,
    "Documenting/Recording Information": 4.1,
    "Getting Information": 4.2,
    "Resolving Conflicts and Negotiating with Others": 3.9,
    "Organizing, Planning, and Prioritizing Work": 3.8,
    "Providing Consultation and Advice to Others": 4.0,
    "Performing for or Working Directly with the Public": 4.1,
  },
  "23": {
    // Legal
    "Analyzing Data or Information": 4.5,
    "Getting Information": 4.6,
    "Making Decisions and Solving Problems": 4.4,
    "Interpreting the Meaning of Information for Others": 4.5,
    "Processing Information": 4.3,
    "Evaluating Information to Determine Compliance with Standards": 4.6,
    "Communicating with People Outside the Organization": 4.2,
    "Documenting/Recording Information": 4.1,
    "Resolving Conflicts and Negotiating with Others": 4.3,
    "Updating and Using Relevant Knowledge": 4.4,
  },
  "25": {
    // Education
    "Training and Teaching Others": 4.8,
    "Coaching and Developing Others": 4.4,
    "Making Decisions and Solving Problems": 4.0,
    "Communicating with Supervisors, Peers, or Subordinates": 4.2,
    "Establishing and Maintaining Interpersonal Relationships": 4.3,
    "Getting Information": 4.1,
    "Organizing, Planning, and Prioritizing Work": 4.2,
    "Updating and Using Relevant Knowledge": 4.3,
    "Thinking Creatively": 3.8,
    "Documenting/Recording Information": 3.7,
  },
  "29": {
    // Healthcare Practitioners
    "Making Decisions and Solving Problems": 4.6,
    "Assisting and Caring for Others": 4.5,
    "Documenting/Recording Information": 4.3,
    "Getting Information": 4.4,
    "Updating and Using Relevant Knowledge": 4.5,
    "Processing Information": 4.1,
    "Communicating with Supervisors, Peers, or Subordinates": 4.2,
    "Interpreting the Meaning of Information for Others": 4.0,
    "Establishing and Maintaining Interpersonal Relationships": 4.1,
    "Monitor Processes, Materials, or Surroundings": 4.0,
  },
  "31": {
    // Healthcare Support
    "Assisting and Caring for Others": 4.7,
    "Performing General Physical Activities": 4.2,
    "Handling and Moving Objects": 3.8,
    "Getting Information": 4.0,
    "Documenting/Recording Information": 3.9,
    "Communicating with Supervisors, Peers, or Subordinates": 4.0,
    "Monitor Processes, Materials, or Surroundings": 3.8,
    "Establishing and Maintaining Interpersonal Relationships": 4.1,
    "Making Decisions and Solving Problems": 3.5,
    "Performing for or Working Directly with the Public": 3.8,
  },
  "33": {
    // Protective Service
    "Making Decisions and Solving Problems": 4.4,
    "Performing General Physical Activities": 4.1,
    "Communicating with Supervisors, Peers, or Subordinates": 4.3,
    "Getting Information": 4.2,
    "Performing for or Working Directly with the Public": 4.3,
    "Resolving Conflicts and Negotiating with Others": 4.0,
    "Documenting/Recording Information": 4.1,
    "Monitor Processes, Materials, or Surroundings": 4.0,
    "Operating Vehicles, Mechanized Devices, or Equipment": 3.8,
    "Identifying Objects, Actions, and Events": 4.0,
  },
  "35": {
    // Food Preparation
    "Performing General Physical Activities": 4.3,
    "Handling and Moving Objects": 4.2,
    "Monitor Processes, Materials, or Surroundings": 3.8,
    "Coordinating the Work and Activities of Others": 3.5,
    "Making Decisions and Solving Problems": 3.4,
    "Getting Information": 3.5,
    "Communicating with Supervisors, Peers, or Subordinates": 3.7,
    "Training and Teaching Others": 3.2,
    "Organizing, Planning, and Prioritizing Work": 3.5,
    "Inspecting Equipment, Structures, or Materials": 3.3,
  },
  "37": {
    // Building and Grounds
    "Performing General Physical Activities": 4.5,
    "Handling and Moving Objects": 4.3,
    "Operating Vehicles, Mechanized Devices, or Equipment": 3.8,
    "Inspecting Equipment, Structures, or Materials": 3.6,
    "Monitor Processes, Materials, or Surroundings": 3.5,
    "Making Decisions and Solving Problems": 3.0,
    "Getting Information": 3.2,
    "Organizing, Planning, and Prioritizing Work": 3.3,
    "Communicating with Supervisors, Peers, or Subordinates": 3.1,
    "Controlling Machines and Processes": 3.2,
  },
  "43": {
    // Office and Administrative Support
    "Interacting With Computers": 4.4,
    "Processing Information": 4.3,
    "Getting Information": 4.2,
    "Communicating with Supervisors, Peers, or Subordinates": 4.1,
    "Documenting/Recording Information": 4.2,
    "Performing Administrative Activities": 4.3,
    "Organizing, Planning, and Prioritizing Work": 3.9,
    "Communicating with People Outside the Organization": 3.8,
    "Making Decisions and Solving Problems": 3.5,
    "Establishing and Maintaining Interpersonal Relationships": 3.6,
  },
  "47": {
    // Construction
    "Performing General Physical Activities": 4.6,
    "Handling and Moving Objects": 4.4,
    "Inspecting Equipment, Structures, or Materials": 4.0,
    "Making Decisions and Solving Problems": 3.8,
    "Getting Information": 3.7,
    "Operating Vehicles, Mechanized Devices, or Equipment": 3.9,
    "Coordinating the Work and Activities of Others": 3.5,
    "Communicating with Supervisors, Peers, or Subordinates": 3.6,
    "Monitor Processes, Materials, or Surroundings": 3.7,
    "Organizing, Planning, and Prioritizing Work": 3.5,
  },
  "49": {
    // Installation, Maintenance, and Repair
    "Repairing and Maintaining Mechanical Equipment": 4.4,
    "Repairing and Maintaining Electronic Equipment": 3.8,
    "Inspecting Equipment, Structures, or Materials": 4.2,
    "Making Decisions and Solving Problems": 3.9,
    "Getting Information": 3.8,
    "Monitor Processes, Materials, or Surroundings": 3.7,
    "Performing General Physical Activities": 4.0,
    "Handling and Moving Objects": 3.8,
    "Communicating with Supervisors, Peers, or Subordinates": 3.5,
    "Controlling Machines and Processes": 3.5,
  },
  "53": {
    // Transportation
    "Operating Vehicles, Mechanized Devices, or Equipment": 4.5,
    "Performing General Physical Activities": 4.0,
    "Monitor Processes, Materials, or Surroundings": 4.0,
    "Inspecting Equipment, Structures, or Materials": 3.8,
    "Getting Information": 3.5,
    "Making Decisions and Solving Problems": 3.5,
    "Handling and Moving Objects": 3.8,
    "Communicating with Supervisors, Peers, or Subordinates": 3.3,
    "Identifying Objects, Actions, and Events": 3.5,
    "Documenting/Recording Information": 3.2,
  },
};

/** Seeded random number generator for reproducible demo data */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateDemoData(): {
  activities: WorkActivitiesOutput;
  automation: AutomationScoresOutput;
} {
  console.log("Generating demo O*NET data...");

  // Use the same occupations as BLS demo
  // We need to import the codes — just inline the most common ones
  const SOC_CODES = [
    "11-1011", "11-1021", "11-1031", "11-2021", "11-2022", "11-3011", "11-3013",
    "11-3021", "11-3031", "11-3051", "11-3061", "11-3071", "11-3111", "11-3121",
    "11-3131", "11-9013", "11-9021", "11-9032", "11-9033", "11-9041", "11-9111",
    "11-9151", "11-9161", "11-9179", "11-9198", "11-9199",
    "13-1041", "13-1071", "13-1075", "13-1082", "13-1111", "13-1121", "13-1151",
    "13-1161", "13-2011", "13-2031", "13-2041", "13-2051", "13-2061",
    "15-1211", "15-1212", "15-1221", "15-1232", "15-1241", "15-1242", "15-1243",
    "15-1244", "15-1251", "15-1252", "15-1253", "15-1255", "15-1299", "15-2011",
    "15-2021", "15-2031", "15-2041", "15-2051",
    "17-1011", "17-1022", "17-2011", "17-2041", "17-2051", "17-2071", "17-2081",
    "17-2112", "17-2141", "17-2199", "17-3011", "17-3023", "17-3026",
    "19-1013", "19-1023", "19-1031", "19-1042", "19-2031", "19-2041", "19-3011",
    "19-3032", "19-3034", "19-3051", "19-4042", "19-4071",
    "21-1011", "21-1012", "21-1013", "21-1014", "21-1015", "21-1021", "21-1022",
    "21-1023", "21-1029", "21-1091", "21-1092", "21-1093",
    "23-1011", "23-1012", "23-1021", "23-1023", "23-2011", "23-2093",
    "25-1011", "25-1021", "25-1032", "25-1042", "25-1052", "25-1071", "25-1082",
    "25-2011", "25-2012", "25-2021", "25-2022", "25-2031", "25-2052", "25-2057",
    "25-2058", "25-2059", "25-3011", "25-3021", "25-3031", "25-4011", "25-4022",
    "25-9031", "25-9044", "25-9045",
    "29-1011", "29-1021", "29-1031", "29-1041", "29-1051", "29-1071", "29-1122",
    "29-1123", "29-1126", "29-1127", "29-1131", "29-1141", "29-1151", "29-1161",
    "29-1171", "29-1211", "29-1215", "29-1216", "29-1218", "29-1221", "29-1223",
    "29-1228", "29-1229", "29-1241", "29-1248", "29-1292", "29-2010", "29-2032",
    "29-2034", "29-2041", "29-2042", "29-2052", "29-2061",
    "31-1120", "31-1131", "31-2011", "31-2021", "31-9091", "31-9092", "31-9097",
    "33-1011", "33-1012", "33-1021", "33-2011", "33-2021", "33-3011", "33-3012",
    "33-3021", "33-3051", "33-3052", "33-9011", "33-9032", "33-9091",
    "35-1012", "35-2014", "35-2021",
    "37-1011", "37-1012", "37-2011", "37-3011", "37-3013",
    "43-1011", "43-3011", "43-3021", "43-3031", "43-3051", "43-3061", "43-4031",
    "43-4051", "43-4061", "43-4071", "43-4081", "43-4111", "43-4121", "43-4161",
    "43-4171", "43-5011", "43-5021", "43-5031", "43-5032", "43-5061", "43-6011",
    "43-6012", "43-6013", "43-6014", "43-9061",
    "47-1011", "47-2031", "47-2061", "47-2073", "47-2111", "47-2152", "47-4011",
    "49-1011", "49-3023", "49-3042", "49-9021", "49-9041", "49-9042", "49-9051",
    "49-9052", "49-9071",
    "53-1041", "53-1042", "53-2011", "53-3032", "53-3033", "53-3051", "53-3052",
    "53-3054", "53-4011", "53-4031", "53-5021", "53-6021", "53-7021", "53-7051",
    "53-7062",
  ];

  const activitiesData: Record<string, OccupationActivities> = {};
  const automationData: Record<string, AutomationScore> = {};

  const rng = seededRandom(42);

  for (const socCode of SOC_CODES) {
    const majorGroup = socCode.split("-")[0];
    const profile = OCCUPATION_PROFILES[majorGroup] || OCCUPATION_PROFILES["43"];

    // Generate activities with values influenced by the occupation profile
    const activities: WorkActivity[] = [];
    for (const actName of ALL_WORK_ACTIVITIES) {
      const baseImportance = profile[actName] || (2.0 + rng() * 2.0);
      // Add small random variation
      const importance =
        Math.round(
          Math.max(1.0, Math.min(5.0, baseImportance + (rng() - 0.5) * 0.6)) *
            100
        ) / 100;
      const frequency =
        Math.round(
          Math.max(1.0, Math.min(5.0, importance + (rng() - 0.5) * 0.8)) * 100
        ) / 100;

      activities.push({ name: actName, importance, frequency });
    }

    // Sort by importance descending
    activities.sort((a, b) => b.importance - a.importance);
    activitiesData[socCode] = { activities };

    // Compute automation score
    let weightedSum = 0;
    let totalWeight = 0;
    const scored: Array<{ name: string; autoScore: number; importance: number }> =
      [];

    for (const act of activities) {
      const autoRank = AUTOMATION_RANKINGS[act.name] ?? 0.5;
      weightedSum += autoRank * act.importance;
      totalWeight += act.importance;
      scored.push({
        name: act.name,
        autoScore: autoRank,
        importance: act.importance,
      });
    }

    const automationPotential =
      totalWeight > 0
        ? Math.round((weightedSum / totalWeight) * 100) / 100
        : 0.5;

    scored.sort(
      (a, b) => b.autoScore * b.importance - a.autoScore * a.importance
    );
    const topAutomatable = scored.slice(0, 3).map((s) => s.name);

    scored.sort(
      (a, b) => a.autoScore * a.importance - b.autoScore * b.importance
    );
    const topHuman = scored
      .filter((s) => s.importance >= 3.0)
      .slice(0, 3)
      .map((s) => s.name);

    automationData[socCode] = {
      automationPotential,
      topAutomatableTasks: topAutomatable,
      topHumanTasks:
        topHuman.length > 0
          ? topHuman
          : scored.slice(0, 3).map((s) => s.name),
    };
  }

  const recordCount = Object.keys(activitiesData).length;
  console.log(`Generated data for ${recordCount} occupations`);

  return {
    activities: {
      _meta: {
        source: "O*NET 29.0",
        version: "2024 (demo)",
        recordCount,
      },
      data: activitiesData,
    },
    automation: {
      _meta: { source: "O*NET + Analysis", version: "2024 (demo)" },
      data: automationData,
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const isDemo = args.includes("--demo");
  const dirIdx = args.indexOf("--dir");
  const dirPath = dirIdx !== -1 ? args[dirIdx + 1] : undefined;

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let result: {
    activities: WorkActivitiesOutput;
    automation: AutomationScoresOutput;
  };

  if (isDemo) {
    result = generateDemoData();
  } else if (dirPath) {
    result = processRealData(dirPath);
  } else {
    console.error(
      "Usage:\n" +
        "  npx tsx scripts/fetch-onet.ts --demo\n" +
        "  npx tsx scripts/fetch-onet.ts --dir path/to/onet_db/\n"
    );
    process.exit(1);
  }

  fs.writeFileSync(ACTIVITIES_OUTPUT, JSON.stringify(result.activities, null, 2));
  console.log(`Wrote ${ACTIVITIES_OUTPUT}`);

  fs.writeFileSync(AUTOMATION_OUTPUT, JSON.stringify(result.automation, null, 2));
  console.log(`Wrote ${AUTOMATION_OUTPUT}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
