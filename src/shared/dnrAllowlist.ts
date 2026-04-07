import { ALLOWLIST_RULE_START, DNR_RESOURCE_TYPES } from "./constants";
import { webext } from "./webext";

export const MAX_ALLOWLIST_HOSTS = 1_500;
export const FIREFOX_ALLOWLIST_HOSTS = 1_500;
export const CHROMIUM_ALLOWLIST_HOSTS = 2_500;
export const FALLBACK_ALLOWLIST_HOSTS = MAX_ALLOWLIST_HOSTS;

export type AllowlistCapacitySource =
  | "capability-unavailable"
  | "firefox-conservative"
  | "chromium-dynamic-rules"
  | "fallback-default";

export interface AllowlistCapacitySummary {
  maxHosts: number;
  totalHosts: number;
  activeHosts: number;
  pendingHosts: number;
  overflowed: boolean;
  source: AllowlistCapacitySource;
}

export function summarizeAllowlistCapacity(
  hosts: string[],
  options: { maxHosts?: number; source?: AllowlistCapacitySource } = {}
): AllowlistCapacitySummary {
  const maxHosts = options.maxHosts ?? resolveAllowlistHostCapacity().maxHosts;
  const source = options.source ?? resolveAllowlistHostCapacity().source;
  const activeHosts = Math.min(hosts.length, maxHosts);
  return {
    maxHosts,
    totalHosts: hosts.length,
    activeHosts,
    pendingHosts: Math.max(0, hosts.length - activeHosts),
    overflowed: hosts.length > maxHosts,
    source
  };
}

export function resolveAllowlistHostCapacity(): {
  maxHosts: number;
  source: AllowlistCapacitySource;
} {
  const hasDnr =
    typeof webext?.declarativeNetRequest?.getDynamicRules === "function" &&
    typeof webext?.declarativeNetRequest?.updateDynamicRules === "function";
  if (!hasDnr) {
    return {
      maxHosts: MAX_ALLOWLIST_HOSTS,
      source: "capability-unavailable"
    };
  }

  const userAgent = (globalThis.navigator?.userAgent ?? "").toLowerCase();
  const extensionScheme = webext?.runtime?.getURL?.("/") ?? "";
  const isFirefox =
    userAgent.includes("firefox") || extensionScheme.startsWith("moz-extension://");
  if (isFirefox) {
    return {
      maxHosts: FIREFOX_ALLOWLIST_HOSTS,
      source: "firefox-conservative"
    };
  }

  const isChromiumLike =
    extensionScheme.startsWith("chrome-extension://") ||
    userAgent.includes("chrome") ||
    userAgent.includes("chromium") ||
    userAgent.includes("edg/");
  if (isChromiumLike) {
    return {
      maxHosts: CHROMIUM_ALLOWLIST_HOSTS,
      source: "chromium-dynamic-rules"
    };
  }

  return {
    maxHosts: FALLBACK_ALLOWLIST_HOSTS,
    source: "fallback-default"
  };
}

export function buildAllowlistRules(hosts: string[]) {
  const capacity = resolveAllowlistHostCapacity();
  const summary = summarizeAllowlistCapacity(hosts, capacity);
  const trimmed = hosts.slice(0, summary.activeHosts);
  const rules = trimmed.flatMap((host, index) => {
    const baseId = ALLOWLIST_RULE_START + index * 2;
    return [
      {
        id: baseId,
        priority: 10_000,
        action: { type: "allow" as const },
        condition: {
          initiatorDomains: [host],
          resourceTypes: DNR_RESOURCE_TYPES
        }
      },
      {
        id: baseId + 1,
        priority: 10_000,
        action: { type: "allow" as const },
        condition: {
          requestDomains: [host],
          resourceTypes: ["main_frame", "sub_frame"] as const
        }
      }
    ];
  });

  return {
    rules,
    summary
  };
}
