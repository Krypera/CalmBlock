import { createWriteStream } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import archiver from "archiver";

const targetArg = process.argv[2] ?? "all";
const targets = targetArg === "all" ? ["chrome", "firefox"] : [targetArg];

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
  await rm(outputZip, { force: true });
  await zipDirectory(sourceDir, outputZip);
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
