import { mkdtemp, mkdir, readFile, rm, cp, readdir } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { access } from "node:fs/promises";

const targetArg = process.argv[2] ?? "all";
const strictMode = process.argv.includes("--strict");
const targets = targetArg === "all" ? ["chrome", "firefox"] : [targetArg];
class SkippableError extends Error {}

const playwright = await loadPlaywright();
const failures = [];
const skipped = [];

for (const target of targets) {
  try {
    if (target === "chrome") {
      await runChromeE2E(playwright);
    } else if (target === "firefox") {
      await runFirefoxE2E(playwright);
    } else {
      throw new Error(`Unsupported browser target: ${target}`);
    }
    console.log(`E2E passed: ${target}`);
  } catch (error) {
    const message = formatError(error);
    if (!strictMode && isSkippableError(error)) {
      skipped.push({ target, message });
      console.warn(`E2E skipped: ${target} (${message})`);
      continue;
    }
    failures.push({ target, message });
    console.error(`E2E failed: ${target} (${message})`);
  }
}

if (failures.length > 0) {
  const detail = failures.map((entry) => `${entry.target}: ${entry.message}`).join("\n");
  throw new Error(`Browser E2E failed:\n${detail}`);
}

if (skipped.length > 0) {
  const detail = skipped.map((entry) => `${entry.target}: ${entry.message}`).join("\n");
  console.warn(`Browser E2E completed with skipped targets:\n${detail}`);
}

async function runChromeE2E(playwrightApi) {
  const distDir = resolve("dist/chrome");
  await assertExists(distDir, "Missing dist/chrome build output. Run `npm run build:chrome` first.");

  const userDataDir = await mkdtemp(join(tmpdir(), "calmblock-e2e-chrome-"));
  const channel = process.env.CALMBLOCK_CHROME_CHANNEL;
  const headless = process.env.CALMBLOCK_E2E_HEADLESS === "1";

  let context = null;
  let fixtureServer = null;
  try {
    fixtureServer = await startLocalFixtureServer();
    context = await playwrightApi.chromium.launchPersistentContext(userDataDir, {
      headless,
      ...(channel ? { channel } : {}),
      args: [`--disable-extensions-except=${distDir}`, `--load-extension=${distDir}`]
    });

    const sitePage = await context.newPage();
    await sitePage.goto(fixtureServer.baseUrl, { waitUntil: "domcontentloaded" });

    const extensionId = await resolveChromiumExtensionId(context, userDataDir, distDir);
    const extensionBase = `chrome-extension://${extensionId}`;
    await runCommonFlows(context, extensionBase, "chrome", fixtureServer.baseUrl);
  } catch (error) {
    throw normalizeBrowserError(error, "chrome");
  } finally {
    await context?.close();
    await fixtureServer?.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
}

async function runFirefoxE2E(playwrightApi) {
  const distDir = resolve("dist/firefox");
  await assertExists(distDir, "Missing dist/firefox build output. Run `npm run build:firefox` first.");

  const userDataDir = await mkdtemp(join(tmpdir(), "calmblock-e2e-firefox-"));
  const addonId = "calmblock@krypera.dev";
  const extensionProfileDir = resolve(userDataDir, "extensions", addonId);

  let context = null;
  let fixtureServer = null;
  try {
    fixtureServer = await startLocalFixtureServer();
    await mkdir(resolve(userDataDir, "extensions"), { recursive: true });
    await cp(distDir, extensionProfileDir, { recursive: true });

    context = await playwrightApi.firefox.launchPersistentContext(userDataDir, {
      headless: true,
      firefoxUserPrefs: {
        "xpinstall.signatures.required": false,
        "extensions.autoDisableScopes": 0,
        "extensions.enabledScopes": 15
      }
    });

    const sitePage = await context.newPage();
    await sitePage.goto(fixtureServer.baseUrl, { waitUntil: "domcontentloaded" });

    const extensionUuid = await resolveFirefoxExtensionUuid(userDataDir, addonId, context);
    if (!extensionUuid) {
      throw new SkippableError(
        "Firefox extension UUID could not be resolved from profile metadata (prefs/extensions.json)"
      );
    }

    const extensionBase = `moz-extension://${extensionUuid}`;
    await runCommonFlows(context, extensionBase, "firefox", fixtureServer.baseUrl);
  } catch (error) {
    throw normalizeBrowserError(error, "firefox");
  } finally {
    await context?.close();
    await fixtureServer?.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
}

async function runCommonFlows(context, extensionBaseUrl, browserTarget, fixtureBaseUrl) {
  await primeStorageState(context, `${extensionBaseUrl}/debug.html`);
  await verifyAllowlistOverflow(context, `${extensionBaseUrl}/options.html`);
  await verifyPopupBehavior(context, `${extensionBaseUrl}/popup.html`);
  await verifyRuntimeToggleFlow(context, `${extensionBaseUrl}/debug.html`, fixtureBaseUrl);
}

async function primeStorageState(context, url) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    if (!api?.storage?.local?.set) {
      throw new Error("storage.local.set unavailable");
    }
    const setStorage = (items) =>
      new Promise((resolve, reject) => {
        try {
          const maybePromise = api.storage.local.set(items);
          if (maybePromise?.then) {
            maybePromise.then(resolve).catch(reject);
            return;
          }
          api.storage.local.set(items, () => {
            const err = api.runtime?.lastError;
            if (err) {
              reject(new Error(err.message ?? String(err)));
              return;
            }
            resolve(undefined);
          });
        } catch (error) {
          reject(error);
        }
      });
    const overflowAllowlist = Array.from({ length: 2602 }, (_, index) => `host-${index}.example`);
    await setStorage({
      "calmblock.settings": {
        enabled: true,
        advancedMode: true,
        groups: {
          ads: true,
          trackers: true,
          annoyances: true,
          strict: false
        }
      },
      "calmblock.allowlist": overflowAllowlist
    });
  });
  await page.close();
}

async function verifyAllowlistOverflow(context, optionsUrl) {
  const page = await context.newPage();
  await page.goto(optionsUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#allowlist-warning:not(.hidden)");
  const warningText = await page.locator("#allowlist-warning").innerText();
  if (!/\d+-host/.test(warningText) || !warningText.toLowerCase().includes("browser limit")) {
    throw new Error("Allowlist overflow warning text missing host-capacity browser limit signal");
  }
  await page.close();
}

async function verifyPopupBehavior(context, popupUrl) {
  const page = await context.newPage();
  await page.goto(popupUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#global-toggle");
  await page.waitForSelector("#site-toggle");

  const siteStatusText = await page.locator("#site-status").innerText();
  if (!siteStatusText.toLowerCase().includes("unsupported")) {
    throw new Error(
      "Popup did not render unsupported-page status when opened on an extension-origin tab"
    );
  }

  await page.close();
}

async function verifyRuntimeToggleFlow(context, debugUrl, fixtureBaseUrl) {
  const warmupPage = await context.newPage();
  await warmupPage.goto(`${fixtureBaseUrl}/app-shell`, { waitUntil: "domcontentloaded" });
  await warmupPage.close();

  const page = await context.newPage();
  await page.goto(debugUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#debug-output");

  const result = await page.evaluate(async () => {
    const api = globalThis.browser ?? globalThis.chrome;
    if (!api?.tabs?.query || !api?.runtime?.sendMessage) {
      return { ok: false, reason: "tabs.query or runtime.sendMessage unavailable" };
    }
    const queryTabs = (queryInfo) =>
      new Promise((resolve, reject) => {
        try {
          const maybePromise = api.tabs.query(queryInfo);
          if (maybePromise?.then) {
            maybePromise.then(resolve).catch(reject);
            return;
          }
          api.tabs.query(queryInfo, (tabList) => {
            const err = api.runtime?.lastError;
            if (err) {
              reject(new Error(err.message ?? String(err)));
              return;
            }
            resolve(tabList ?? []);
          });
        } catch (error) {
          reject(error);
        }
      });
    const sendRuntimeMessage = (message) =>
      new Promise((resolve, reject) => {
        try {
          const maybePromise = api.runtime.sendMessage(message);
          if (maybePromise?.then) {
            maybePromise.then(resolve).catch(reject);
            return;
          }
          api.runtime.sendMessage(message, (response) => {
            const err = api.runtime?.lastError;
            if (err) {
              reject(new Error(err.message ?? String(err)));
              return;
            }
            resolve(response);
          });
        } catch (error) {
          reject(error);
        }
      });

    const tabs = await queryTabs({});
    const httpTabs = tabs.filter((tab) => typeof tab.id === "number" && /^https?:\/\//.test(tab.url ?? ""));
    if (httpTabs.length === 0) {
      return { ok: false, reason: "No HTTP tab available for runtime toggle flow" };
    }

    let selected = null;
    let popupStateResponse = null;
    const popupAttempts = [];
    for (const tab of httpTabs) {
      const response = await sendRuntimeMessage({
        type: "GET_POPUP_STATE",
        tabId: tab.id,
        url: tab.url
      });
      popupAttempts.push({
        id: tab.id,
        url: tab.url,
        ok: Boolean(response?.ok),
        hasState: Boolean(response?.state),
        error: response?.error ?? null
      });
      if (response?.ok && response.state) {
        selected = tab;
        popupStateResponse = response;
        break;
      }
    }

    if (!selected?.id || !selected.url || !popupStateResponse) {
      return {
        ok: false,
        reason: "GET_POPUP_STATE did not yield a valid state for any HTTP tab",
        inspectedTabs: httpTabs.map((tab) => ({ id: tab.id, url: tab.url })),
        popupAttempts
      };
    }

    const host = new URL(selected.url).hostname;
    const sitePauseResponse = await sendRuntimeMessage({
      type: "TOGGLE_SITE",
      host,
      enabled: false,
      tabId: selected.id
    });
    const globalOffResponse = await sendRuntimeMessage({
      type: "TOGGLE_GLOBAL",
      enabled: false
    });
    const globalOnResponse = await sendRuntimeMessage({
      type: "TOGGLE_GLOBAL",
      enabled: true
    });
    const siteResumeResponse = await sendRuntimeMessage({
      type: "TOGGLE_SITE",
      host,
      enabled: true,
      tabId: selected.id
    });

    return {
      ok: true,
      popupStateResponse,
      sitePauseResponse,
      siteResumeResponse,
      globalOffResponse,
      globalOnResponse
    };
  });

  if (!result.ok) {
    const details = result.popupAttempts ? ` (${JSON.stringify(result.popupAttempts)})` : "";
    throw new Error(`${result.reason ?? "Runtime toggle flow failed to run"}${details}`);
  }
  if (result.popupStateResponse.state.liveStatsAvailable !== false) {
    throw new Error("Expected live counter fallback state when optional feedback permission is absent");
  }

  for (const [label, response] of Object.entries({
    sitePause: result.sitePauseResponse,
    siteResume: result.siteResumeResponse,
    globalOff: result.globalOffResponse,
    globalOn: result.globalOnResponse
  })) {
    if (!response?.ok) {
      throw new Error(`${label} runtime message failed (${JSON.stringify(response)})`);
    }
    if (!response.applySummary) {
      throw new Error(`${label} runtime message missing applySummary`);
    }
  }

  await page.close();
}

async function resolveChromiumExtensionId(context, userDataDir, distDir) {
  let serviceWorker = context.serviceWorkers()[0] ?? null;
  if (!serviceWorker) {
    try {
      serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 });
    } catch {
      // Fall through to profile preferences fallback.
    }
  }
  if (serviceWorker) {
    const url = serviceWorker.url();
    const match = url.match(/^chrome-extension:\/\/([^/]+)\//);
    if (match) {
      return match[1];
    }
  }

  const fromPreferences = await resolveChromiumExtensionIdFromPreferences(userDataDir, distDir);
  if (fromPreferences) {
    return fromPreferences;
  }
  const fromTargets = await resolveChromiumExtensionIdFromCdpTargets(context);
  if (fromTargets) {
    return fromTargets;
  }
  throw new Error(
    "Chromium extension id could not be resolved (service worker, profile preferences, and CDP target scan all failed)"
  );
}

async function resolveFirefoxExtensionUuid(profileDir, addonId, context) {
  const prefsPath = resolve(profileDir, "prefs.js");
  const userPrefsPath = resolve(profileDir, "user.js");
  const extensionsJsonPath = resolve(profileDir, "extensions.json");
  const extensionSettingsPath = resolve(profileDir, "extension-settings.json");
  const attempts = 120;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const prefs = await readFile(prefsPath, "utf8");
      const fromPrefs = extractFirefoxUuidFromPrefs(prefs, addonId);
      if (fromPrefs) {
        return fromPrefs;
      }
    } catch {
      // Continue with next fallback source.
    }

    try {
      const userPrefs = await readFile(userPrefsPath, "utf8");
      const fromUserPrefs = extractFirefoxUuidFromPrefs(userPrefs, addonId);
      if (fromUserPrefs) {
        return fromUserPrefs;
      }
    } catch {
      // Continue with next fallback source.
    }

    try {
      const raw = await readFile(extensionsJsonPath, "utf8");
      const parsed = JSON.parse(raw);
      const fromExtensionsJson = extractFirefoxUuidFromExtensionsJson(parsed, addonId);
      if (fromExtensionsJson) {
        return fromExtensionsJson;
      }
    } catch {
      // Continue with next fallback source.
    }

    try {
      const raw = await readFile(extensionSettingsPath, "utf8");
      const parsed = JSON.parse(raw);
      const fromExtensionSettings = extractFirefoxUuidFromExtensionSettings(parsed, addonId);
      if (fromExtensionSettings) {
        return fromExtensionSettings;
      }
    } catch {
      // Continue with next fallback source.
    }

    const fromStorage = await resolveFirefoxUuidFromStorageOrigins(profileDir);
    if (fromStorage) {
      return fromStorage;
    }

    const fromContext = resolveFirefoxUuidFromContext(context);
    if (fromContext) {
      return fromContext;
    }

    await delay(500);
  }

  return null;
}

function extractFirefoxUuidFromPrefs(rawPrefs, addonId) {
  const marker = 'user_pref("extensions.webextensions.uuids",';
  const line = rawPrefs
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(marker));
  if (!line) {
    return null;
  }

  const rawValue = line.slice(marker.length).trim().replace(/\);$/, "");
  const wrapped = rawValue.startsWith('"') ? rawValue : `"${rawValue}"`;
  try {
    const decoded = JSON.parse(wrapped);
    const mapping = JSON.parse(decoded);
    const candidate = mapping?.[addonId];
    return normalizeFirefoxUuidCandidate(candidate);
  } catch {
    return null;
  }
}

function extractFirefoxUuidFromExtensionsJson(parsed, addonId) {
  const addons = Array.isArray(parsed?.addons) ? parsed.addons : [];
  const addon = addons.find((entry) => entry?.id === addonId);
  if (!addon) {
    return null;
  }

  const direct = normalizeFirefoxUuidCandidate(addon.internalUUID);
  if (direct) {
    return direct;
  }

  const baseUrl = typeof addon.baseURL === "string" ? addon.baseURL : "";
  const baseMatch = baseUrl.match(/^moz-extension:\/\/([^/]+)\//);
  const fromBase = normalizeFirefoxUuidCandidate(baseMatch?.[1]);
  if (fromBase) {
    return fromBase;
  }

  const hostname = normalizeFirefoxUuidCandidate(addon.mozExtensionHostname);
  if (hostname) {
    return hostname;
  }

  return null;
}

function extractFirefoxUuidFromExtensionSettings(parsed, addonId) {
  const addon = parsed?.[addonId];
  if (!addon || typeof addon !== "object") {
    return null;
  }

  const fromUuid = normalizeFirefoxUuidCandidate(addon.uuid);
  if (fromUuid) {
    return fromUuid;
  }

  const fromInternalUuid = normalizeFirefoxUuidCandidate(addon.internalUUID);
  if (fromInternalUuid) {
    return fromInternalUuid;
  }

  const fromBase = typeof addon.baseURL === "string" ? addon.baseURL : "";
  const baseMatch = fromBase.match(/^moz-extension:\/\/([^/]+)\//);
  return normalizeFirefoxUuidCandidate(baseMatch?.[1]);
}

async function resolveFirefoxUuidFromStorageOrigins(profileDir) {
  const storageDefaultDir = resolve(profileDir, "storage", "default");
  try {
    const entries = await readdir(storageDefaultDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const match = entry.name.match(/^moz-extension\+\+\+([^^]+)(?:\^|$)/);
      if (!match?.[1]) {
        continue;
      }
      const candidate = decodeURIComponent(match[1]);
      const uuid = normalizeFirefoxUuidCandidate(candidate);
      if (uuid) {
        return uuid;
      }
    }
  } catch {
    return null;
  }
  return null;
}

function resolveFirefoxUuidFromContext(context) {
  for (const page of context.pages()) {
    const match = page.url().match(/^moz-extension:\/\/([^/]+)\//);
    const candidate = normalizeFirefoxUuidCandidate(match?.[1]);
    if (candidate) {
      return candidate;
    }
  }

  if (typeof context.serviceWorkers === "function") {
    for (const worker of context.serviceWorkers()) {
      const match = worker.url().match(/^moz-extension:\/\/([^/]+)\//);
      const candidate = normalizeFirefoxUuidCandidate(match?.[1]);
      if (candidate) {
        return candidate;
      }
    }
  }

  return null;
}

function normalizeFirefoxUuidCandidate(candidate) {
  if (typeof candidate !== "string") {
    return null;
  }
  const trimmed = candidate.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

async function resolveChromiumExtensionIdFromPreferences(userDataDir, distDir) {
  const preferencesPath = resolve(userDataDir, "Default", "Preferences");
  const normalizedDistDir = normalizeFsPath(distDir);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const raw = await readFile(preferencesPath, "utf8");
      const preferences = JSON.parse(raw);
      const extensionSettings = preferences?.extensions?.settings;
      if (extensionSettings && typeof extensionSettings === "object") {
        for (const [extensionId, entry] of Object.entries(extensionSettings)) {
          const entryPath = normalizeFsPath(entry?.path ?? "");
          if (entryPath === normalizedDistDir) {
            return extensionId;
          }
        }
      }
    } catch {
      // Retry until timeout.
    }
    await delay(500);
  }

  return null;
}

async function resolveChromiumExtensionIdFromCdpTargets(context) {
  const page = context.pages()[0] ?? (await context.newPage());
  const cdp = await context.newCDPSession(page);
  try {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const result = await cdp.send("Target.getTargets");
      const targetInfos = result?.targetInfos ?? [];
      for (const target of targetInfos) {
        const url = target?.url ?? "";
        const match = url.match(/^chrome-extension:\/\/([^/]+)\//);
        if (match?.[1]) {
          return match[1];
        }
      }
      await delay(500);
    }
  } finally {
    await cdp.detach().catch(() => undefined);
  }
  return null;
}

async function assertExists(path, message) {
  try {
    await access(path);
  } catch {
    throw new Error(message);
  }
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    throw new Error(
      "Missing playwright dependency. Install with `npm i -D playwright` and run `npx playwright install chrome firefox`."
    );
  }
}

function normalizeBrowserError(error, target) {
  const message = formatError(error);
  if (
    message.includes("Executable doesn't exist") ||
    message.includes("Failed to launch") ||
    message.includes("browserType.launch") ||
    message.includes("not found")
  ) {
    return new SkippableError(
      `No usable ${target} browser runtime found (${message}). Run 'npm run e2e:browser:setup' for local validation.`
    );
  }
  return error;
}

function isSkippableError(error) {
  return error instanceof SkippableError;
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function normalizeFsPath(pathValue) {
  return String(pathValue).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

async function startLocalFixtureServer() {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>CalmBlock Fixture</title></head><body><main id="fixture-root"><h1>Fixture Page</h1><p>Local deterministic fixture server for E2E.</p></main></body></html>`;
  const server = createServer((request, response) => {
    const url = request.url ?? "/";
    if (url === "/app-shell" || url === "/" || url.startsWith("/?")) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    }
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => resolvePromise(undefined));
  });

  const address = server.address();
  if (!address || typeof address !== "object") {
    throw new Error("Fixture server address resolution failed");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    async close() {
      await new Promise((resolvePromise) => server.close(() => resolvePromise(undefined)));
    }
  };
}
