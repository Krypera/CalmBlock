import { webext } from "./webext";

export type BrowserTarget = "chrome" | "firefox" | "edge" | "orion" | "safari" | "unknown";

export interface BrowserRuntimeInfo {
  target: BrowserTarget;
  browserVersion: string | null;
}

export interface BrowserCapabilities {
  storageLocal: boolean;
  declarativeNetRequest: boolean;
  dynamicRules: boolean;
  matchedRuleTelemetry: boolean;
  optionalPermissionsQuery: boolean;
  optionalPermissionsRequest: boolean;
}

export class BrowserAdapter {
  static getApi() {
    return webext;
  }

  static detectTarget(ua = getNavigatorUserAgent(), api = webext): BrowserTarget {
    const lower = ua.toLowerCase();
    const runtimeUrl = api?.runtime?.getURL?.("/") ?? null;
    const globals = globalThis as {
      browser?: unknown;
      chrome?: unknown;
    };

    if (lower.includes("orion/")) {
      return "orion";
    }
    if (runtimeUrl?.startsWith("moz-extension://")) {
      return "firefox";
    }
    if (runtimeUrl?.startsWith("safari-web-extension://")) {
      return "safari";
    }
    if (lower.includes("edg/")) {
      return "edge";
    }
    if (lower.includes("firefox/")) {
      return "firefox";
    }
    if (!globals.chrome && globals.browser) {
      return "firefox";
    }
    if (lower.includes("safari/") && !lower.includes("chrome/") && !lower.includes("chromium/")) {
      return "safari";
    }
    if (runtimeUrl?.startsWith("chrome-extension://")) {
      return "chrome";
    }
    if (lower.includes("chrome/")) {
      return "chrome";
    }
    return "unknown";
  }

  static getRuntimeInfo(ua = getNavigatorUserAgent(), api = webext): BrowserRuntimeInfo {
    return {
      target: this.detectTarget(ua, api),
      browserVersion: this.extractVersion(ua)
    };
  }

  static getCompatibilityMode(
    target = this.detectTarget(),
    locationSearch = getLocationSearch()
  ): "enabled" | "disabled" | "unknown" {
    const params = new URLSearchParams(locationSearch);
    const hinted = (params.get("compatibilityMode") ?? params.get("compat") ?? "").toLowerCase();
    if (hinted === "enabled" || hinted === "disabled") {
      return hinted;
    }
    if (target === "orion") {
      return "unknown";
    }
    return "disabled";
  }

  static getCapabilities(api = webext): BrowserCapabilities {
    return {
      storageLocal:
        typeof api?.storage?.local?.get === "function" &&
        typeof api.storage.local.set === "function",
      declarativeNetRequest: typeof api?.declarativeNetRequest?.updateEnabledRulesets === "function",
      dynamicRules:
        typeof api?.declarativeNetRequest?.getDynamicRules === "function" &&
        typeof api.declarativeNetRequest.updateDynamicRules === "function",
      matchedRuleTelemetry: typeof api?.declarativeNetRequest?.getMatchedRules === "function",
      optionalPermissionsQuery: typeof api?.permissions?.contains === "function",
      optionalPermissionsRequest: typeof api?.permissions?.request === "function"
    };
  }

  private static extractVersion(ua: string): string | null {
    const target = this.detectTarget(ua);
    const patterns: Record<Exclude<BrowserTarget, "unknown">, RegExp> = {
      chrome: /chrome\/([\d.]+)/i,
      edge: /edg\/([\d.]+)/i,
      firefox: /firefox\/([\d.]+)/i,
      orion: /orion\/([\d.]+)/i,
      safari: /version\/([\d.]+)/i
    };
    if (target === "unknown") {
      return null;
    }
    return patterns[target].exec(ua)?.[1] ?? null;
  }
}

function getNavigatorUserAgent(): string {
  if (typeof navigator === "undefined") {
    return "";
  }
  return navigator.userAgent ?? "";
}

function getLocationSearch(): string {
  if (typeof location === "undefined") {
    return "";
  }
  return location.search ?? "";
}
