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
const VALID_GROUP_CATEGORIES = new Set(["ads", "trackers", "annoyances", "strict"]);
const VALID_RULE_ANNOTATION_KEYS = new Set(["provenance", "reason", "fixture", "tags"]);

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

function parseRuleAnnotations(rawAnnotations, lineNumber, sourceFile) {
  const entries = rawAnnotations
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  const annotations = {};

  for (const entry of entries) {
    const separator = entry.indexOf("=");
    if (separator < 1) {
      throw new Error(
        `Invalid rule annotation in ${sourceFile}:${lineNumber} (expected 'key=value')`
      );
    }

    const key = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    if (!VALID_RULE_ANNOTATION_KEYS.has(key)) {
      throw new Error(
        `Invalid rule annotation key '${key}' in ${sourceFile}:${lineNumber}`
      );
    }
    if (!value) {
      throw new Error(`Empty annotation value for '${key}' in ${sourceFile}:${lineNumber}`);
    }

    annotations[key] = key === "tags"
      ? [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))]
      : value;
  }

  return annotations;
}

export function parseLine(line, lineNumber, sourceFile) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const segments = trimmed.split(" | ");
  if (segments.length < 2 || segments.length > 3) {
    throw new Error(
      `Invalid rule format in ${sourceFile}:${lineNumber} (expected 'filter | types' or 'filter | types | key=value; key=value')`
    );
  }

  const rawFilter = segments[0]?.trim() ?? "";
  const rawTypes = segments[1]?.trim() ?? "";
  const rawAnnotations = segments[2]?.trim() ?? "";
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
    annotations: rawAnnotations
      ? parseRuleAnnotations(rawAnnotations, lineNumber, sourceFile)
      : {},
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

  const seen = new Map();
  return allEntries.filter((entry) => {
    const key = `${entry.filter}|${entry.resourceTypes.join(",")}`;
    const existing = seen.get(key);
    if (existing) {
      if (normalizeRuleAnnotations(existing.annotations) !== normalizeRuleAnnotations(entry.annotations)) {
        throw new Error(
          `Duplicate rule with conflicting annotations in ${sourceFile}:${entry.lineNumber}`
        );
      }
      return false;
    }
    seen.set(key, entry);
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
  validateProgram(manifest.program);

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
    validateGroupMetadata(group);
  }

  const sortedBases = [...idBases].sort((left, right) => left - right);
  if (idBases.some((value, index) => value !== sortedBases[index])) {
    throw new Error("Manifest groups must be sorted by idBase");
  }
}

function validateProgram(program) {
  if (!program || typeof program !== "object") {
    throw new Error("Rules manifest must declare a program block");
  }
  if (typeof program.owner !== "string" || !program.owner.trim()) {
    throw new Error("Rules manifest program.owner must be a non-empty string");
  }
  if (typeof program.releaseCadence !== "string" || !program.releaseCadence.trim()) {
    throw new Error("Rules manifest program.releaseCadence must be a non-empty string");
  }
  if (typeof program.provenancePolicy !== "string" || !program.provenancePolicy.trim()) {
    throw new Error("Rules manifest program.provenancePolicy must be a non-empty string");
  }
  if (typeof program.ruleAuthoring !== "string" || !program.ruleAuthoring.trim()) {
    throw new Error("Rules manifest program.ruleAuthoring must be a non-empty string");
  }
  if (
    !Array.isArray(program.annotationFields) ||
    program.annotationFields.length === 0 ||
    !program.annotationFields.every((field) => VALID_RULE_ANNOTATION_KEYS.has(field))
  ) {
    throw new Error("Rules manifest program.annotationFields must be a non-empty list of supported keys");
  }
}

function validateGroupMetadata(group) {
  if (!VALID_GROUP_CATEGORIES.has(group.category)) {
    throw new Error(`Invalid category for group '${group.id}'`);
  }
  if (typeof group.description !== "string" || !group.description.trim()) {
    throw new Error(`Group '${group.id}' must include a description`);
  }
  if (typeof group.sourceFile !== "string" || !group.sourceFile.trim()) {
    throw new Error(`Group '${group.id}' must include a sourceFile`);
  }
  if (typeof group.reviewedAt !== "string" || !group.reviewedAt.trim()) {
    throw new Error(`Group '${group.id}' must include reviewedAt`);
  }
  if (
    group.fixtures !== undefined &&
    (!Array.isArray(group.fixtures) || !group.fixtures.every((fixture) => typeof fixture === "string"))
  ) {
    throw new Error(`Group '${group.id}' fixtures must be a string array`);
  }
  if (!Array.isArray(group.provenance) || group.provenance.length === 0) {
    throw new Error(`Group '${group.id}' must include provenance sources`);
  }

  const seenProvenanceIds = new Set();
  for (const source of group.provenance) {
    if (!source || typeof source !== "object") {
      throw new Error(`Group '${group.id}' has an invalid provenance entry`);
    }
    if (typeof source.id !== "string" || !source.id.trim()) {
      throw new Error(`Group '${group.id}' provenance entries must include id`);
    }
    if (seenProvenanceIds.has(source.id)) {
      throw new Error(`Group '${group.id}' has duplicate provenance id '${source.id}'`);
    }
    seenProvenanceIds.add(source.id);
    if (typeof source.label !== "string" || !source.label.trim()) {
      throw new Error(`Group '${group.id}' provenance '${source.id}' must include label`);
    }
    if (typeof source.kind !== "string" || !source.kind.trim()) {
      throw new Error(`Group '${group.id}' provenance '${source.id}' must include kind`);
    }
    if (typeof source.reviewedAt !== "string" || !source.reviewedAt.trim()) {
      throw new Error(`Group '${group.id}' provenance '${source.id}' must include reviewedAt`);
    }
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
  const normalized = entries
    .map((entry) => {
      const annotationSignature = normalizeRuleAnnotations(entry.annotations);
      return `${entry.filter}|${entry.resourceTypes.join(",")}|${annotationSignature}`;
    })
    .join("\n");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function normalizeRuleAnnotations(annotations) {
  const normalized = Object.entries(annotations)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}=${[...value].sort().join(",")}`;
      }
      return `${key}=${value}`;
    });
  return normalized.join(";");
}

function summarizeAnnotationCoverage(entries) {
  const coverage = {
    provenance: 0,
    reason: 0,
    fixture: 0,
    tags: 0
  };

  for (const entry of entries) {
    for (const key of Object.keys(coverage)) {
      if (entry.annotations[key]) {
        coverage[key] += 1;
      }
    }
  }

  return coverage;
}

function countAnnotatedRules(entries) {
  return entries.filter((entry) => Object.keys(entry.annotations).length > 0).length;
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
    program: {
      ...manifest.program,
      groupCount: manifest.groups.length
    },
    summary: {
      groupCount: manifest.groups.length,
      totalRules: 0,
      annotatedRules: 0,
      annotationRate: 0
    },
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
    metadata.summary.totalRules += rules.length;
    metadata.summary.annotatedRules += countAnnotatedRules(entries);
    metadata.groups[group.id] = {
      category: group.category,
      description: group.description,
      reviewedAt: group.reviewedAt,
      sourceFile: group.sourceFile,
      fixtures: group.fixtures ?? [],
      provenance: group.provenance,
      ruleCount: rules.length,
      idRange: {
        start: rules[0]?.id ?? group.idBase,
        end: rules.at(-1)?.id ?? group.idBase
      },
      sourceDigest: buildSourceDigest(entries),
      annotationCoverage: summarizeAnnotationCoverage(entries),
      changes: {
        added,
        removed,
        delta: added - removed
      }
    };
  }

  metadata.summary.annotationRate = metadata.summary.totalRules === 0
    ? 0
    : Number((metadata.summary.annotatedRules / metadata.summary.totalRules).toFixed(4));

  await writeFile(resolve(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf8");
}

const scriptPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (scriptPath && scriptPath === fileURLToPath(import.meta.url)) {
  await generateRulesets();
}
