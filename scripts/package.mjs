import { createWriteStream } from "node:fs";
import { mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import archiver from "archiver";

const targetArg = process.argv[2] ?? "all";
const targets = targetArg === "all" ? ["chrome", "firefox"] : [targetArg];
const validateOnly = process.argv.includes("--validate-only");

const packageJson = await import(pathToFileURL(resolve("package.json")).href, {
  with: { type: "json" }
});
const version = packageJson.default.version;

for (const target of targets) {
  const sourceDir = resolve("dist", target);
  await ensureExists(sourceDir);
  await validatePackagingSource(sourceDir, target);

  const outputDir = resolve("dist", "packages");
  await mkdir(outputDir, { recursive: true });

  const outputZip = resolve(outputDir, `calmblock-${target}-v${version}.zip`);
  if (validateOnly) {
    await ensureExists(outputZip);
    await validateZipFile(outputZip, target);
    console.log(`Validated: ${outputZip}`);
    continue;
  }

  await rm(outputZip, { force: true });
  await zipDirectory(sourceDir, outputZip);
  await validateZipFile(outputZip, target);
  console.log(`Created: ${outputZip}`);
}

async function ensureExists(path) {
  try {
    await stat(path);
  } catch {
    throw new Error(`Build output not found: ${path}. Run build first.`);
  }
}

async function validatePackagingSource(sourceDir, target) {
  const required = [
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js",
    "options.html",
    "options.js",
    "debug.html",
    "debug.js",
    "rules/ads.json",
    "rules/trackers.json",
    "rules/annoyances.json",
    "rules/strict.json",
    "rules/metadata.json"
  ];

  for (const file of required) {
    await ensureExists(resolve(sourceDir, file));
  }

  const manifestRaw = await readFile(resolve(sourceDir, "manifest.json"), "utf8");
  const manifest = JSON.parse(manifestRaw);
  validateManifest(manifest, target);

  const rulesMetadataRaw = await readFile(resolve(sourceDir, "rules/metadata.json"), "utf8");
  const rulesMetadata = JSON.parse(rulesMetadataRaw);
  validateRulesMetadata(rulesMetadata, target);
  await validateReleaseProgramDocs(target);

  const forbiddenPathPattern = /(^|\/)(src|tests|scripts|node_modules|\.git)(\/|$)/;
  const forbiddenExtPattern = /\.(ts|tsx)$/i;
  const allFiles = await walkFiles(sourceDir);
  for (const file of allFiles) {
    const rel = relative(sourceDir, file).replace(/\\/g, "/");
    if (forbiddenPathPattern.test(rel)) {
      throw new Error(`${target}: forbidden path in package source: ${rel}`);
    }
    if (forbiddenExtPattern.test(rel)) {
      throw new Error(`${target}: forbidden TypeScript source in package: ${rel}`);
    }
  }
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(full)));
      continue;
    }
    if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function validateManifest(manifest, target) {
  if (manifest.manifest_version !== 3) {
    throw new Error(`${target}: manifest_version must be 3`);
  }
  if (typeof manifest.name !== "string" || !manifest.name.includes("CalmBlock")) {
    throw new Error(`${target}: manifest name must include CalmBlock`);
  }
  if (!manifest.background?.service_worker) {
    throw new Error(`${target}: missing background.service_worker`);
  }
  if (!manifest.action?.default_popup || manifest.action.default_popup !== "popup.html") {
    throw new Error(`${target}: action.default_popup must be popup.html`);
  }
  if (!Array.isArray(manifest.host_permissions) || !manifest.host_permissions.includes("<all_urls>")) {
    throw new Error(`${target}: host_permissions must include <all_urls>`);
  }
}

function validateRulesMetadata(metadata, target) {
  if (typeof metadata.generatedAt !== "string" || !metadata.generatedAt.includes("T")) {
    throw new Error(`${target}: rules metadata.generatedAt missing or invalid`);
  }
  if (!metadata.program || typeof metadata.program.owner !== "string" || !metadata.program.owner) {
    throw new Error(`${target}: rules metadata program.owner missing or invalid`);
  }
  if (
    !metadata.summary ||
    !Number.isInteger(metadata.summary.groupCount) ||
    !Number.isInteger(metadata.summary.totalRules) ||
    !Number.isInteger(metadata.summary.annotatedRules)
  ) {
    throw new Error(`${target}: rules metadata summary missing or invalid`);
  }
  const requiredGroups = ["ads", "trackers", "annoyances", "strict"];
  for (const group of requiredGroups) {
    if (!metadata.groups?.[group]) {
      throw new Error(`${target}: rules metadata missing group '${group}'`);
    }
    const info = metadata.groups[group];
    if (typeof info.category !== "string" || !info.category) {
      throw new Error(`${target}: rules metadata category invalid for '${group}'`);
    }
    if (typeof info.reviewedAt !== "string" || !info.reviewedAt) {
      throw new Error(`${target}: rules metadata reviewedAt invalid for '${group}'`);
    }
    if (!Array.isArray(info.fixtures) || !Array.isArray(info.provenance) || info.provenance.length < 1) {
      throw new Error(`${target}: rules metadata provenance/fixtures invalid for '${group}'`);
    }
    if (!Number.isInteger(info.ruleCount) || info.ruleCount < 1) {
      throw new Error(`${target}: rules metadata ruleCount invalid for '${group}'`);
    }
    if (!info.idRange || !Number.isInteger(info.idRange.start) || !Number.isInteger(info.idRange.end)) {
      throw new Error(`${target}: rules metadata idRange invalid for '${group}'`);
    }
    if (typeof info.sourceDigest !== "string" || info.sourceDigest.length !== 16) {
      throw new Error(`${target}: rules metadata sourceDigest invalid for '${group}'`);
    }
    if (
      !info.annotationCoverage ||
      !Number.isInteger(info.annotationCoverage.provenance) ||
      !Number.isInteger(info.annotationCoverage.reason) ||
      !Number.isInteger(info.annotationCoverage.fixture) ||
      !Number.isInteger(info.annotationCoverage.tags)
    ) {
      throw new Error(`${target}: rules metadata annotationCoverage invalid for '${group}'`);
    }
    if (
      !info.changes ||
      !Number.isInteger(info.changes.added) ||
      !Number.isInteger(info.changes.removed) ||
      !Number.isInteger(info.changes.delta)
    ) {
      throw new Error(`${target}: rules metadata changes invalid for '${group}'`);
    }
  }
}

async function validateReleaseProgramDocs(target) {
  const requiredDocs = [
    resolve("RELEASE_READINESS.md"),
    resolve("docs/release-browser-program.md"),
    resolve("docs/release-browser-matrix.md")
  ];
  for (const docPath of requiredDocs) {
    await ensureExists(docPath);
  }

  const releaseReadiness = await readFile(resolve("RELEASE_READINESS.md"), "utf8");
  const browserProgram = await readFile(resolve("docs/release-browser-program.md"), "utf8");
  const releaseMatrix = await readFile(resolve("docs/release-browser-matrix.md"), "utf8");

  const readinessSignals = [
    "## Browser support gates",
    "## v0.2 execution gates",
    "Chromium family is certified"
  ];
  const programSignals = [
    "## Canonical Artifact Lanes",
    "## v0.2 E2E Expansion",
    "Gated / under validation"
  ];
  const matrixSignals = [
    "| Chrome | Chromium |",
    "| Firefox | Firefox family |",
    "| Orion | Orion lane |",
    "| Safari | Safari lane |"
  ];

  for (const signal of readinessSignals) {
    if (!releaseReadiness.includes(signal)) {
      throw new Error(`${target}: RELEASE_READINESS.md missing signal '${signal}'`);
    }
  }
  for (const signal of programSignals) {
    if (!browserProgram.includes(signal)) {
      throw new Error(`${target}: release-browser-program.md missing signal '${signal}'`);
    }
  }
  for (const signal of matrixSignals) {
    if (!releaseMatrix.includes(signal)) {
      throw new Error(`${target}: release-browser-matrix.md missing signal '${signal}'`);
    }
  }
}

async function validateZipFile(zipPath, target) {
  const zipStats = await stat(zipPath);
  if (!zipStats.isFile()) {
    throw new Error(`${target}: package output is not a file: ${zipPath}`);
  }
  if (zipStats.size < 15 * 1024) {
    throw new Error(`${target}: package zip is unexpectedly small (${zipStats.size} bytes)`);
  }
}

async function zipDirectory(sourceDir, outputFile) {
  await new Promise((resolvePromise, rejectPromise) => {
    const output = createWriteStream(outputFile);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolvePromise());
    output.on("error", rejectPromise);
    archive.on("error", rejectPromise);

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}
