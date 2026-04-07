import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const targetArg = process.argv[2] ?? "all";
const targets = targetArg === "all" ? ["chrome", "firefox"] : [targetArg];

const requiredTopLevelFiles = [
  "manifest.json",
  "popup.html",
  "popup.js",
  "options.html",
  "options.js",
  "debug.html",
  "debug.js",
  "background.js",
  "content.js"
];

const requiredRuleFiles = [
  "rules/ads.json",
  "rules/trackers.json",
  "rules/annoyances.json",
  "rules/strict.json",
  "rules/metadata.json"
];

for (const target of targets) {
  await validateTarget(target);
}

async function validateTarget(target) {
  const distDir = resolve("dist", target);
  for (const file of [...requiredTopLevelFiles, ...requiredRuleFiles]) {
    await assertExists(resolve(distDir, file), `${target}: missing required file ${file}`);
  }

  const manifest = JSON.parse(await readFile(resolve(distDir, "manifest.json"), "utf8"));
  const resources = manifest?.declarative_net_request?.rule_resources;
  if (!Array.isArray(resources)) {
    throw new Error(`${target}: manifest missing declarative_net_request.rule_resources`);
  }

  const expectedRulesets = ["ads", "trackers", "annoyances", "strict"];
  for (const id of expectedRulesets) {
    const item = resources.find((entry) => entry?.id === id);
    if (!item) {
      throw new Error(`${target}: manifest missing ruleset id '${id}'`);
    }
    if (typeof item.path !== "string" || !item.path.endsWith(`/${id}.json`)) {
      throw new Error(`${target}: ruleset '${id}' has invalid path`);
    }
  }

  if (manifest?.background?.service_worker !== "background.js") {
    throw new Error(`${target}: background service worker is not background.js`);
  }
  if (manifest?.action?.default_popup !== "popup.html") {
    throw new Error(`${target}: default popup is not popup.html`);
  }
}

async function assertExists(filePath, message) {
  try {
    await access(filePath);
  } catch {
    throw new Error(message);
  }
}
