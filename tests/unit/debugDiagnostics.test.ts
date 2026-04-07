import { describe, expect, it } from "vitest";
import { buildShareSafeDiagnostics } from "../../src/debug/diagnostics";

describe("buildShareSafeDiagnostics", () => {
  it("redacts hosts, urls, and allowlist arrays", () => {
    const input = {
      activeTab: {
        url: "https://example.com/path?a=1",
        host: "example.com"
      },
      allowlist: ["example.com", "news.example.com"],
      nested: {
        domain: "sub.example.com"
      }
    };

    const redacted = buildShareSafeDiagnostics(input) as {
      activeTab: { url: string; host: string };
      allowlist: string[];
      nested: { domain: string };
    };

    expect(redacted.activeTab.url).toBe("<redacted-url>");
    expect(redacted.activeTab.host).toBe("<redacted-host>");
    expect(redacted.allowlist).toEqual(["<redacted:2-hosts>"]);
    expect(redacted.nested.domain).toBe("<redacted-host>");
  });
});
