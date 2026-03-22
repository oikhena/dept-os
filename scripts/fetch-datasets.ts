#!/usr/bin/env node
/**
 * Dataset Fetch Orchestrator
 *
 * Runs all data acquisition scripts in sequence to download and process
 * external datasets into the JSON files the app reads at runtime.
 *
 * Usage:
 *   npx tsx scripts/fetch-datasets.ts           # Run all (BLS/O*NET in demo mode)
 *   npx tsx scripts/fetch-datasets.ts --real     # Run all with real data (requires local files)
 *
 * By default, BLS OEWS and O*NET scripts run with --demo since they require
 * manually downloaded data files. World Bank and WHO scripts fetch live data.
 *
 * To use real BLS/O*NET data, download the files first and run the individual
 * scripts with --file or --dir arguments. See each script for details.
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const isReal = process.argv.includes("--real");

const scripts = [
  {
    name: "BLS OEWS",
    script: "scripts/fetch-bls-oews.ts",
    args: isReal ? "" : "--demo",
    description: "Salary data for ~200 occupations",
  },
  {
    name: "O*NET",
    script: "scripts/fetch-onet.ts",
    args: isReal ? "" : "--demo",
    description: "Work activities and automation scores",
  },
  {
    name: "World Bank",
    script: "scripts/fetch-world-bank.ts",
    args: "",
    description: "GDP, health/education expenditure, internet access",
  },
  {
    name: "WHO",
    script: "scripts/fetch-who.ts",
    args: "",
    description: "Health workforce density by country",
  },
];

// Ensure data output directories exist
const dataDir = path.join(process.cwd(), "data/datasets");
fs.mkdirSync(dataDir, { recursive: true });

console.log("=".repeat(60));
console.log("  DEPT.OS Dataset Fetcher");
console.log("=".repeat(60));
console.log(`  Mode: ${isReal ? "REAL (requires local data files)" : "DEMO + Live APIs"}`);
console.log(`  Output: ${dataDir}`);
console.log("=".repeat(60));

let succeeded = 0;
let failed = 0;

for (const s of scripts) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  Fetching ${s.name}...`);
  console.log(`  ${s.description}`);
  console.log(`${"─".repeat(60)}`);

  try {
    const cmd = `npx tsx ${s.script} ${s.args}`.trim();
    execSync(cmd, {
      stdio: "inherit",
      cwd: process.cwd(),
      timeout: 120_000, // 2 minute timeout per script
    });
    console.log(`\n  [OK] ${s.name} complete`);
    succeeded++;
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(`\n  [FAIL] ${s.name} failed: ${errMsg}`);
    failed++;
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`  Results: ${succeeded} succeeded, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) {
  console.log("\nSome scripts failed. This is expected if:");
  console.log("  - Network is unavailable (World Bank / WHO scripts)");
  console.log("  - Running in --real mode without the required data files");
  console.log("\nFailed scripts can be re-run individually. See each script for usage.");
}

// List generated files
console.log("\nGenerated files:");
try {
  const files = fs.readdirSync(dataDir);
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      const sizeKB = Math.round(stat.size / 1024);
      console.log(`  ${file} (${sizeKB} KB)`);
    } else if (stat.isDirectory()) {
      const subFiles = fs.readdirSync(filePath);
      console.log(`  ${file}/ (${subFiles.length} files)`);
    }
  }
} catch {
  // Ignore errors listing files
}

process.exit(failed > 0 ? 1 : 0);
