import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath correctly converts file:// URLs on Windows (C:\\...), Linux and macOS.
const root = fileURLToPath(new URL("..", import.meta.url));
const required = [
  "AGENTS.md",
  "docs/EXECUTIVE_ARCHITECTURE_FA.md",
  "docs/CRAWLING_AND_COMPLIANCE_FA.md",
  "docs/TRAVEL_CONNECTIVITY_PAYMENTS_FA.md",
  "docs/MODEL_ROSTER_FA.md",
  "config/model-router.yaml",
  "config/sources.json"
];

for (const file of required) await access(join(root, file));
const registry = JSON.parse(await readFile(join(root, "config/sources.json"), "utf8"));
const ids = new Set();
const countries = new Set();

for (const source of registry.sources) {
  if (ids.has(source.id)) throw new Error(`Duplicate source id: ${source.id}`);
  ids.add(source.id);
  countries.add(source.country);
  if (!source.base_url.startsWith("https://")) throw new Error(`Non-HTTPS source: ${source.id}`);
  if (source.status !== "manual_review") throw new Error(`Unexpected active source: ${source.id}`);
}

for (const country of ["AE", "TR", "IR", "SA", "IQ"]) {
  if (!countries.has(country)) throw new Error(`Missing country: ${country}`);
}

console.log(`OK: ${registry.sources.length} sources across ${countries.size} countries; all require manual review.`);

const router = await readFile(join(root, "config/model-router.yaml"), "utf8");
for (const requiredDeny of ["openai", "anthropic", "fail_closed"]) {
  if (!router.includes(requiredDeny)) throw new Error(`Missing router deny policy: ${requiredDeny}`);
}
