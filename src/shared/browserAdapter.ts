import { webext } from "./webext";

export type BrowserTarget = "chrome" | "firefox" | "edge" | "unknown";

export class BrowserAdapter {
  static getApi() {
    return webext;
  }

  static detectTarget(ua = navigator.userAgent): BrowserTarget {
    const lower = ua.toLowerCase();
    if (lower.includes("edg/")) {
      return "edge";
    }
    if (lower.includes("firefox/")) {
      return "firefox";
    }
    if (lower.includes("chrome/")) {
      return "chrome";
    }
    return "unknown";
  }
}
