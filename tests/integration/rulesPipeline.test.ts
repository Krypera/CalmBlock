import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readJson(filePath: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), filePath), "utf8"));
}

describe("rules pipeline outputs", () => {
  it("keeps metadata and generated rules in sync", () => {
    const metadata = readJson("public/rules/metadata.json");
    for (const [group, info] of Object.entries(metadata.groups as Record<string, { ruleCount: number }>)) {
      const rules = readJson(`public/rules/${group}.json`);
      expect(rules.length).toBe(info.ruleCount);
      const ids = new Set(rules.map((rule: { id: number }) => rule.id));
      expect(ids.size).toBe(rules.length);
    }
  });
});
