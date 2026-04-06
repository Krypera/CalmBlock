import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
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
