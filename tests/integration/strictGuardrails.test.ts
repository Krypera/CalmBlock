import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const BREAKAGE_TERMS = [
  "login",
  "signin",
  "sign-in",
  "signup",
  "checkout",
  "payment",
  "billing",
  "cart",
  "auth",
  "wallet"
];

describe("strict rules guardrails", () => {
  it("avoids direct login/payment/app-shell endpoint patterns", () => {
    const raw = readFileSync(resolve(process.cwd(), "scripts/rules/sources/strict.list"), "utf8");
    const filters = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => line.split(" | ")[0]?.toLowerCase() ?? "");

    for (const filter of filters) {
      const hasBreakageToken = BREAKAGE_TERMS.some((term) => filter.includes(term));
      expect(hasBreakageToken).toBe(false);
    }
  });
});
