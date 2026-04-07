import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VALID_RESOURCE_TYPES = new Set([
  "main_frame",
  "sub_frame",
  "script",
  "stylesheet",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "media",
  "websocket",
  "other"
]);

function toRuleFingerprint(rule) {
  const types = [...rule.condition.resourceTypes].sort().join(",");
  return `${rule.condition.urlFilter}|${types}`;
}

function compareEntries(left, right) {
  const filterCompare = left.filter.localeCompare(right.filter);
  if (filterCompare !== 0) {
    return filterCompare;
  }
  return left.resourceTypes.join(",").localeCompare(right.resourceTypes.join(","));
}

export function parseLine(line, lineNumber, sourceFile) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separator = trimmed.indexOf(" | ");
  if (separator < 0) {
    throw new Error(`Invalid rule format in ${sourceFile}:${lineNumber} (expected 'filter | types')`);
  }
  const rawFilter = trimmed.slice(0, separator).trim();
  const rawTypes = trimmed.slice(separator + 3).trim();
  if (!rawFilter) {
    throw new Error(`Empty filter in ${sourceFile}:${lineNumber}`);
  }

  const resourceTypes = [...new Set(rawTypes
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean))];

  if (!resourceTypes.length) {
    throw new Error(`Missing resource types in ${sourceFile}:${lineNumber}`);
  }

  for (const type of resourceTypes) {
    if (!VALID_RESOURCE_TYPES.has(type)) {
      throw new Error(`Invalid resourceType '${type}' in ${sourceFile}:${lineNumber}`);
    }
  }

  return {
    filter: rawFilter,
    resourceTypes,
    lineNumber
  };
}

export async function readRuleEntries(sourceFile) {
  const raw = await readFile(resolve(sourceFile), "utf8");
  const allEntries = raw
    .split(/\r?\n/)
    .map((line, index) => parseLine(line, index + 1, sourceFile))
    .filter(Boolean);

  for (let index = 1; index < allEntries.length; index += 1) {
    const previous = allEntries[index - 1];
    const current = allEntries[index];
    if (compareEntries(previous, current) > 0) {
      throw new Error(
        `Rules in ${sourceFile} must be sorted by filter/types (line ${previous.lineNumber} before ${current.lineNumber})`
      );
    }
  }

  const seen = new Set();
  return allEntries.filter((entry) => {
    const key = `${entry.filter}|${entry.resourceTypes.join(",")}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function buildRules(group, entries) {
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

function validateManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.groups) || manifest.groups.length === 0) {
    throw new Error("Rules manifest must contain at least one group");
  }
  const seenGroupIds = new Set();
  const idBases = [...manifest.groups].map((group) => group.idBase);
  for (const group of manifest.groups) {
    if (!group.id || typeof group.id !== "string") {
      throw new Error("Each ruleset group must have a valid id");
    }
    if (seenGroupIds.has(group.id)) {
      throw new Error(`Duplicate group id in manifest: ${group.id}`);
    }
    seenGroupIds.add(group.id);
    if (!Number.isInteger(group.idBase) || group.idBase <= 0) {
      throw new Error(`Invalid idBase for group '${group.id}'`);
    }
  }

  const sortedBases = [...idBases].sort((left, right) => left - right);
  if (idBases.some((value, index) => value !== sortedBases[index])) {
    throw new Error("Manifest groups must be sorted by idBase");
  }
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function buildSourceDigest(entries) {
  const normalized = entries.map((entry) => `${entry.filter}|${entry.resourceTypes.join(",")}`).join("\n");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export async function generateRulesets(options = {}) {
  const manifestPath = resolve(options.manifestPath ?? "scripts/rules/sources.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  validateManifest(manifest);

  const outDir = resolve(options.outDir ?? "public/rules");
  await mkdir(outDir, { recursive: true });

  const generatedAt = typeof options.generatedAt === "string"
    ? options.generatedAt
    : `${manifest.updated}T00:00:00.000Z`;
  const metadata = {
    version: manifest.version,
    updated: manifest.updated,
    generatedAt,
    groups: {}
  };
  const allRuleIds = new Set();

  for (const group of manifest.groups) {
    const entries = await readRuleEntries(group.sourceFile);
    const rules = buildRules(group, entries);
    const outFile = resolve(outDir, `${group.id}.json`);
    const previousRules = (await readJsonIfExists(outFile)) ?? [];
    const previousFingerprints = new Set(previousRules.map(toRuleFingerprint));
    const currentFingerprints = new Set(rules.map(toRuleFingerprint));

    for (const rule of rules) {
      if (allRuleIds.has(rule.id)) {
        throw new Error(`Duplicate rule id detected across groups: ${rule.id}`);
      }
      allRuleIds.add(rule.id);
    }

    for (let index = 1; index < rules.length; index += 1) {
      if (rules[index - 1].id >= rules[index].id) {
        throw new Error(`Rules must be strictly sorted by id for group '${group.id}'`);
      }
    }

    const added = [...currentFingerprints].filter((key) => !previousFingerprints.has(key)).length;
    const removed = [...previousFingerprints].filter((key) => !currentFingerprints.has(key)).length;

    await writeFile(outFile, JSON.stringify(rules, null, 2), "utf8");
    metadata.groups[group.id] = {
      description: group.description,
      sourceFile: group.sourceFile,
      ruleCount: rules.length,
      idRange: {
        start: rules[0]?.id ?? group.idBase,
        end: rules.at(-1)?.id ?? group.idBase
      },
      sourceDigest: buildSourceDigest(entries),
      changes: {
        added,
        removed,
        delta: added - removed
      }
    };
  }

  await writeFile(resolve(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
}

const scriptPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (scriptPath && scriptPath === fileURLToPath(import.meta.url)) {
  await generateRulesets();
}
