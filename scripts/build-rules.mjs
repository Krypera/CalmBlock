import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separator = trimmed.indexOf(" | ");
  if (separator < 0) {
    throw new Error(`Invalid rule format (expected 'filter | types'): ${line}`);
  }
  const rawFilter = trimmed.slice(0, separator).trim();
  const rawTypes = trimmed.slice(separator + 3).trim();
  if (!rawFilter) {
    return null;
  }

  const resourceTypes = rawTypes
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!resourceTypes.length) {
    throw new Error(`Missing resource types for rule: ${line}`);
  }

  return {
    filter: rawFilter,
    resourceTypes
  };
}

async function readRuleEntries(sourceFile) {
  const raw = await readFile(resolve(sourceFile), "utf8");
  const entries = raw
    .split(/\r?\n/)
    .map(parseLine)
    .filter(Boolean);

  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.filter}|${entry.resourceTypes.join(",")}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildRules(group, entries) {
  return entries.map((entry, index) => ({
    id: group.idBase + index,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: entry.filter,
      resourceTypes: entry.resourceTypes
    }
  }));
}

export async function generateRulesets() {
  const manifestPath = resolve("scripts/rules/sources.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const outDir = resolve("public/rules");
  await mkdir(outDir, { recursive: true });

  const metadata = {
    version: manifest.version,
    updated: manifest.updated,
    groups: {}
  };

  for (const group of manifest.groups) {
    const entries = await readRuleEntries(group.sourceFile);
    const rules = buildRules(group, entries);
    const outFile = resolve(outDir, `${group.id}.json`);
    await writeFile(outFile, JSON.stringify(rules, null, 2), "utf8");
    metadata.groups[group.id] = {
      description: group.description,
      sourceFile: group.sourceFile,
      ruleCount: rules.length
    };
  }

  await writeFile(resolve(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
}

const scriptPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (scriptPath && scriptPath === fileURLToPath(import.meta.url)) {
  await generateRulesets();
}
