import { build, context } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const mode = process.argv[2] ?? "all";
const watch = process.argv.includes("--watch");
const targets = mode === "all" ? ["chrome", "firefox"] : [mode];

const baseManifest = JSON.parse(
  await readFile(resolve("scripts/manifest.base.json"), "utf8")
);

const entryPoints = {
  background: "src/background/index.ts",
  content: "src/content/index.ts",
  popup: "src/popup/index.ts",
  options: "src/options/index.ts",
  debug: "src/debug/index.ts"
};

function createManifest(target) {
  const manifest = structuredClone(baseManifest);
  if (target === "firefox") {
    manifest.browser_specific_settings = {
      gecko: {
        id: "calmblock@krypera.dev",
        strict_min_version: "121.0"
      }
    };
  }
  return manifest;
}

async function copyPublic(targetDir) {
  await cp("public", targetDir, { recursive: true });
}

async function writeManifest(target, targetDir) {
  const manifest = createManifest(target);
  await writeFile(
    resolve(targetDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
}

async function buildTarget(target) {
  const outdir = resolve("dist", target);
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });
  await copyPublic(outdir);
  await writeManifest(target, outdir);

  const config = {
    entryPoints,
    outdir,
    bundle: true,
    format: "esm",
    target: "es2022",
    sourcemap: true,
    minify: false,
    define: {
      __TARGET__: JSON.stringify(target)
    }
  };

  if (watch) {
    const ctx = await context(config);
    await ctx.watch();
    return;
  }

  await build(config);
}

for (const target of targets) {
  await buildTarget(target);
}

if (watch) {
  process.stdin.resume();
}
