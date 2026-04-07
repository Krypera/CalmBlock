import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

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
  console.log(`Smoke passed: ${target}`);
}

async function validateTarget(target) {
  const distDir = resolve("dist", target);
  for (const file of [...requiredTopLevelFiles, ...requiredRuleFiles]) {
    await assertExists(resolve(distDir, file), `${target}: missing required file ${file}`);
  }

  const manifest = JSON.parse(await readFile(resolve(distDir, "manifest.json"), "utf8"));
  validateManifest(manifest, target);

  const metadata = JSON.parse(await readFile(resolve(distDir, "rules/metadata.json"), "utf8"));
  validateRulesMetadata(metadata, target);

  await runBackgroundSmoke(distDir, target);
  await runPopupSmoke(distDir, target);
  await runOptionsSmoke(distDir, target);
  await runContentSmoke(distDir, target);
}

function validateManifest(manifest, target) {
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

function validateRulesMetadata(metadata, target) {
  if (typeof metadata.generatedAt !== "string" || !metadata.generatedAt.includes("T")) {
    throw new Error(`${target}: rules metadata.generatedAt missing or invalid`);
  }
  if (!metadata.program?.owner || !metadata.summary) {
    throw new Error(`${target}: rules metadata program/summary missing`);
  }
}

async function runBackgroundSmoke(distDir, target) {
  let onRuntimeMessage = null;
  let onInstalled = null;
  let onStorageChanged = null;
  let onTabUpdated = null;

  const state = {
    "calmblock.settings": {
      enabled: true,
      advancedMode: false,
      groups: {
        ads: true,
        trackers: true,
        annoyances: true,
        strict: false
      }
    },
    "calmblock.allowlist": ["pause.example"]
  };

  const chrome = {
    runtime: {
      getManifest: () => ({ version: "0.1.1" }),
      onInstalled: {
        addListener: (cb) => {
          onInstalled = cb;
        }
      },
      onMessage: {
        addListener: (cb) => {
          onRuntimeMessage = cb;
        }
      }
    },
    storage: {
      local: {
        async get(keys) {
          if (Array.isArray(keys)) {
            return Object.fromEntries(keys.map((key) => [key, state[key]]));
          }
          if (typeof keys === "string") {
            return { [keys]: state[keys] };
          }
          if (keys && typeof keys === "object") {
            return Object.fromEntries(
              Object.entries(keys).map(([key, fallback]) => [key, state[key] ?? fallback])
            );
          }
          return state;
        },
        async set(items) {
          Object.assign(state, items);
        },
        async remove() {}
      },
      onChanged: {
        addListener: (cb) => {
          onStorageChanged = cb;
        }
      }
    },
    tabs: {
      query: async () => [{ id: 1, url: "https://pause.example/home" }],
      sendMessage: async () => undefined,
      onUpdated: {
        addListener: (cb) => {
          onTabUpdated = cb;
        }
      }
    },
    action: {
      setBadgeText: async () => undefined,
      setBadgeBackgroundColor: async () => undefined
    },
    declarativeNetRequest: {
      updateEnabledRulesets: async () => undefined,
      getDynamicRules: async () => [],
      updateDynamicRules: async () => undefined
    }
  };

  await withGlobals({ chrome, browser: undefined }, async () => {
    await importFresh(resolve(distDir, "background.js"), `${target}-background`);
    await flush();
    if (!onInstalled || !onRuntimeMessage || !onStorageChanged || !onTabUpdated) {
      throw new Error(`${target}: background smoke did not register expected listeners`);
    }

    const response = await onRuntimeMessage({
      type: "TOGGLE_SITE",
      host: "pause.example",
      enabled: false,
      tabId: 1
    });

    if (!response?.ok || !response.applySummary) {
      throw new Error(`${target}: background smoke did not return apply summary for site toggle`);
    }
  });
}

async function runPopupSmoke(distDir, target) {
  const html = await readFile(resolve(distDir, "popup.html"), "utf8");
  const dom = new JSDOM(html, {
    url: "https://extension-popup.test/"
  });

  const chrome = {
    tabs: {
      query: async () => [{ id: 7, url: "https://example.com/article" }]
    },
    permissions: {
      contains: async () => false,
      request: async () => false
    },
    runtime: {
      async sendMessage(message) {
        if (message.type === "GET_POPUP_STATE") {
          return {
            ok: true,
            state: {
              host: "example.com",
              globalEnabled: true,
              siteEnabled: true,
              siteDisabled: false,
              effectiveProtectionEnabled: true,
              protectedSummary: "All core protections are active.",
              blockedCount: null,
              liveStatsAvailable: false,
              liveStatsStatus: "permission-required",
              liveStatsMessage:
                "Active protections: Ads, Trackers, Annoyances. Grant the optional feedback permission to show live counts.",
              activeProtectionGroups: ["ads", "trackers", "annoyances"],
              blockedByCategory: {
                ads: 0,
                trackers: 0,
                annoyances: 0,
                strict: 0
              }
            }
          };
        }

        if (message.type === "TOGGLE_SITE") {
          return {
            ok: true,
            applyMode: "reload-recommended",
            applySummary: {
              immediate: ["Popup state and page cleanup update immediately."],
              afterReload: ["Already-loaded requests keep their previous decision until reload."]
            }
          };
        }

        return { ok: true, applyMode: "instant" };
      }
    }
  };

  await withDomGlobals(dom, { chrome, browser: undefined }, async () => {
    await importFresh(resolve(distDir, "popup.js"), `${target}-popup`);
    await flush();

    const enableButton = dom.window.document.querySelector("#enable-live-counters");
    if (enableButton?.classList.contains("hidden")) {
      throw new Error(`${target}: popup smoke expected live counter prompt to be visible`);
    }

    const siteToggle = dom.window.document.querySelector("#site-toggle");
    siteToggle?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await flush();

    const reloadHint = dom.window.document.querySelector("#reload-hint");
    if (reloadHint?.classList.contains("hidden")) {
      throw new Error(`${target}: popup smoke expected reload hint after site toggle`);
    }
  });
}

async function runOptionsSmoke(distDir, target) {
  const html = await readFile(resolve(distDir, "options.html"), "utf8");
  const dom = new JSDOM(html, {
    url: "https://extension-options.test/"
  });

  const overflowAllowlist = Array.from({ length: 1502 }, (_, index) => `host-${index}.example`);
  const state = {
    "calmblock.settings": {
      enabled: true,
      advancedMode: false,
      groups: {
        ads: true,
        trackers: true,
        annoyances: true,
        strict: false
      }
    },
    "calmblock.allowlist": overflowAllowlist
  };

  const chrome = {
    storage: {
      local: {
        async get(keys) {
          if (typeof keys === "string") {
            return { [keys]: state[keys] };
          }
          if (keys && typeof keys === "object" && !Array.isArray(keys)) {
            return Object.fromEntries(
              Object.entries(keys).map(([key, fallback]) => [key, state[key] ?? fallback])
            );
          }
          return state;
        },
        async set(items) {
          Object.assign(state, items);
        }
      }
    }
  };

  await withDomGlobals(dom, { chrome, browser: undefined }, async () => {
    await importFresh(resolve(distDir, "options.js"), `${target}-options`);
    await flush();

    const textarea = dom.window.document.querySelector("#allowlist");
    const warning = dom.window.document.querySelector("#allowlist-warning");
    if (!textarea?.value.includes("host-0.example")) {
      throw new Error(`${target}: options smoke did not load allowlist contents`);
    }
    if (warning?.classList.contains("hidden")) {
      throw new Error(`${target}: options smoke expected allowlist overflow warning`);
    }
  });
}

async function runContentSmoke(distDir, target) {
  const dom = new JSDOM(
    `<!doctype html><html><body>
      <aside class="adsbox">ad</aside>
      <div class="cookie-consent">
        <button type="button">Reject all</button>
      </div>
    </body></html>`,
    {
      url: "https://example.com/"
    }
  );

  let clicked = false;
  const button = dom.window.document.querySelector("button");
  if (button) {
    button.click = () => {
      clicked = true;
    };
  }

  const chrome = {
    runtime: {
      async sendMessage(message) {
        if (message.type === "GET_EFFECTIVE_SITE_STATE") {
          return { ok: true, effectiveEnabled: true };
        }
        return { ok: true };
      },
      onMessage: {
        addListener: () => undefined
      }
    }
  };

  await withDomGlobals(dom, { chrome, browser: undefined }, async () => {
    await importFresh(resolve(distDir, "content.js"), `${target}-content`);
    await flush();

    if (!dom.window.document.querySelector("#calmblock-cosmetic-style")) {
      throw new Error(`${target}: content smoke expected cosmetic style injection`);
    }
    if (!clicked) {
      throw new Error(`${target}: content smoke expected consent rejection click`);
    }
  });
}

async function withDomGlobals(dom, browserGlobals, task) {
  const { window } = dom;
  if (typeof window.requestAnimationFrame !== "function") {
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 0);
  }

  const snapshots = new Map();
  const globals = {
    window,
    document: window.document,
    navigator: window.navigator,
    Node: window.Node,
    Document: window.Document,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
    HTMLButtonElement: window.HTMLButtonElement,
    HTMLInputElement: window.HTMLInputElement,
    ShadowRoot: window.ShadowRoot,
    MutationObserver: window.MutationObserver,
    Event: window.Event,
    MouseEvent: window.MouseEvent,
    Blob: window.Blob,
    URL: window.URL,
    requestAnimationFrame: window.requestAnimationFrame,
    ...browserGlobals
  };

  for (const [key, value] of Object.entries(globals)) {
    snapshots.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value
    });
  }

  try {
    await task();
  } finally {
    for (const [key, descriptor] of snapshots.entries()) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        delete globalThis[key];
      }
    }
  }
}

async function withGlobals(browserGlobals, task) {
  const snapshots = new Map();
  for (const [key, value] of Object.entries(browserGlobals)) {
    snapshots.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value
    });
  }

  try {
    await task();
  } finally {
    for (const [key, descriptor] of snapshots.entries()) {
      if (descriptor) {
        Object.defineProperty(globalThis, key, descriptor);
      } else {
        delete globalThis[key];
      }
    }
  }
}

async function importFresh(filePath, cacheKey) {
  const url = `${pathToFileURL(filePath).href}?smoke=${encodeURIComponent(cacheKey)}-${Date.now()}`;
  return import(url);
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function assertExists(filePath, message) {
  try {
    await access(filePath);
  } catch {
    throw new Error(message);
  }
}
