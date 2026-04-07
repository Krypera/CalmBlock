import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

type GenerateRulesets = (options: {
  manifestPath: string;
  outDir: string;
}) => Promise<void>;

async function getGenerateRulesets(): Promise<GenerateRulesets> {
  const modulePath = pathToFileURL(resolve(process.cwd(), "scripts/build-rules.mjs")).href;
  const module = (await import(modulePath)) as {
    generateRulesets: GenerateRulesets;
  };
  return module.generateRulesets;
}

async function setupWorkspace(payload: {
  ads: string;
  trackers: string;
  idBases?: { ads: number; trackers: number };
}) {
  const root = await mkdtemp(join(tmpdir(), "calmblock-rules-"));
  const rulesDir = join(root, "rules");
  const sourceDir = join(rulesDir, "sources");
  await mkdir(sourceDir, { recursive: true });
  await writeFile(join(sourceDir, "ads.list"), payload.ads, "utf8");
  await writeFile(join(sourceDir, "trackers.list"), payload.trackers, "utf8");
  const bases = payload.idBases ?? { ads: 1, trackers: 1001 };
  const manifest = {
    version: 1,
    updated: "2026-04-07",
    program: {
      owner: "test-suite",
      releaseCadence: "release-bound",
      provenancePolicy: "all groups track provenance",
      ruleAuthoring: "filter | types | key=value; key=value",
      annotationFields: ["provenance", "reason", "fixture", "tags"]
    },
    groups: [
      {
        id: "ads",
        category: "ads",
        idBase: bases.ads,
        description: "test ads",
        reviewedAt: "2026-04-07",
        fixtures: ["tests/content/fixtures/cosmetic-rich.html"],
        provenance: [
          {
            id: "manual-curation",
            label: "Manual curation",
            kind: "maintainer-review",
            reviewedAt: "2026-04-07"
          }
        ],
        sourceFile: join(sourceDir, "ads.list")
      },
      {
        id: "trackers",
        category: "trackers",
        idBase: bases.trackers,
        description: "test trackers",
        reviewedAt: "2026-04-07",
        fixtures: ["tests/unit/currentPageStats.test.ts"],
        provenance: [
          {
            id: "manual-curation",
            label: "Manual curation",
            kind: "maintainer-review",
            reviewedAt: "2026-04-07"
          }
        ],
        sourceFile: join(sourceDir, "trackers.list")
      }
    ]
  };
  const manifestPath = join(rulesDir, "sources.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  return {
    root,
    manifestPath,
    outDir: join(root, "out")
  };
}

describe("rules builder validation", () => {
  it("rejects invalid resource types", async () => {
    const generateRulesets = await getGenerateRulesets();
    const workspace = await setupWorkspace({
      ads: "||example.com^ | script,invalid_type",
      trackers: "||example.org^ | script,xmlhttprequest"
    });

    await expect(
      generateRulesets({ manifestPath: workspace.manifestPath, outDir: workspace.outDir })
    ).rejects.toThrow("Invalid resourceType");
    await rm(workspace.root, { recursive: true, force: true });
  });

  it("rejects unsorted source lists", async () => {
    const generateRulesets = await getGenerateRulesets();
    const workspace = await setupWorkspace({
      ads: ["||z-first.example^ | script", "||a-second.example^ | script"].join("\n"),
      trackers: "||example.org^ | script,xmlhttprequest"
    });

    await expect(
      generateRulesets({ manifestPath: workspace.manifestPath, outDir: workspace.outDir })
    ).rejects.toThrow("must be sorted");
    await rm(workspace.root, { recursive: true, force: true });
  });

  it("rejects duplicate rule ids across groups", async () => {
    const generateRulesets = await getGenerateRulesets();
    const workspace = await setupWorkspace({
      ads: ["||a.example^ | script", "||b.example^ | script"].join("\n"),
      trackers: ["||t.example^ | script", "||u.example^ | script"].join("\n"),
      idBases: { ads: 1, trackers: 2 }
    });

    await expect(
      generateRulesets({ manifestPath: workspace.manifestPath, outDir: workspace.outDir })
    ).rejects.toThrow("Duplicate rule id");
    await rm(workspace.root, { recursive: true, force: true });
  });

  it("rejects empty filters", async () => {
    const generateRulesets = await getGenerateRulesets();
    const workspace = await setupWorkspace({
      ads: "| script",
      trackers: "||example.org^ | script,xmlhttprequest"
    });

    await expect(
      generateRulesets({ manifestPath: workspace.manifestPath, outDir: workspace.outDir })
    ).rejects.toThrow("Invalid rule format");
    await rm(workspace.root, { recursive: true, force: true });
  });

  it("rejects unsupported rule annotations", async () => {
    const generateRulesets = await getGenerateRulesets();
    const workspace = await setupWorkspace({
      ads: "||example.com^ | script | unsupported=value",
      trackers: "||example.org^ | script,xmlhttprequest"
    });

    await expect(
      generateRulesets({ manifestPath: workspace.manifestPath, outDir: workspace.outDir })
    ).rejects.toThrow("Invalid rule annotation key");
    await rm(workspace.root, { recursive: true, force: true });
  });
});
