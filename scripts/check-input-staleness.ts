// check-input-staleness.ts
//
// Purpose: Detects input binding inventory drift against source files
//
// This module:
// - Hashes each source file referenced in inputBindings
// - Compares against stored hashes in inventory-hashes.json
// - Reports files that changed since last hash update

import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { inputBindings } from "../editor/input/inventory";

const HASH_FILE = "scripts/inventory-hashes.json";

const sourceFiles = [...new Set(inputBindings.map((b) => b.sourceFile))];

const current: Record<string, string> = {};
for (const file of sourceFiles) {
  current[file] = createHash("sha256")
    .update(readFileSync(file, "utf8"))
    .digest("hex");
}

const stored: Record<string, string> = existsSync(HASH_FILE)
  ? JSON.parse(readFileSync(HASH_FILE, "utf8"))
  : {};

let anyStale = false;
for (const file of sourceFiles) {
  if (current[file] !== stored[file]) {
    console.log(`STALE: ${file}`);
    anyStale = true;
  }
}

if (!anyStale) {
  console.log("All input binding sources are current.");
}

if (process.argv.includes("--update")) {
  writeFileSync(HASH_FILE, JSON.stringify(current, null, 2));
  console.log("Hashes updated.");
}
