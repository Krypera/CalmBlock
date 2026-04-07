import { describe, expect, it } from "vitest";
import { CosmeticEngine } from "../../src/content/cosmeticEngine";
import { loadFixture } from "./fixtureHarness";

async function flushMutations(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("CosmeticEngine", () => {
  it("injects and clears style tag", () => {
    loadFixture("cosmetic-basic.html");
    const engine = new CosmeticEngine();
    engine.apply();
    expect(document.querySelector("#calmblock-cosmetic-style")).not.toBeNull();
    const styleText = document.querySelector<HTMLStyleElement>("#calmblock-cosmetic-style")?.textContent ?? "";
    expect(styleText).toContain(".adsbox");
    expect(styleText).toContain(".sponsored");
    engine.clear();
    expect(document.querySelector("#calmblock-cosmetic-style")).toBeNull();
  });

  it("keeps single style tag across repeated apply calls", () => {
    loadFixture("cosmetic-rich.html");
    const engine = new CosmeticEngine();
    engine.apply();
    engine.apply();
    const styles = document.querySelectorAll("#calmblock-cosmetic-style");
    expect(styles.length).toBe(1);
    const styleText = styles[0]?.textContent ?? "";
    expect(styleText).toContain("iframe[src*='doubleclick']");
    expect(styleText).toContain("[class*='cookie-banner']");
  });

  it("clear is safe to call repeatedly", () => {
    loadFixture("cosmetic-rich.html");
    const engine = new CosmeticEngine();
    engine.apply();
    engine.clear();
    engine.clear();
    expect(document.querySelector("#calmblock-cosmetic-style")).toBeNull();
  });

  it("hides matching nodes added after apply", async () => {
    loadFixture("cosmetic-basic.html");
    const engine = new CosmeticEngine();
    engine.apply();

    const injected = document.createElement("section");
    injected.className = "sponsored-card";
    document.body.append(injected);

    await flushMutations();

    expect(injected.getAttribute("data-calmblock-hidden")).toBe("true");
    engine.clear();
  });

  it("covers open shadow roots discovered after apply", async () => {
    loadFixture("cosmetic-basic.html");
    const engine = new CosmeticEngine();
    engine.apply();

    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<div class='cookie-consent-banner'>Cookie wall</div>";

    await flushMutations();

    const hidden = shadow.querySelector<HTMLElement>(".cookie-consent-banner");
    expect(hidden?.getAttribute("data-calmblock-hidden")).toBe("true");
    expect(shadow.querySelector("#calmblock-cosmetic-style")).not.toBeNull();
    engine.clear();
  });

  it("covers nested shadow-root ad markers after dynamic mount", async () => {
    loadFixture("cosmetic-basic.html");
    const engine = new CosmeticEngine();
    engine.apply();

    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = "<section id='ad-slot-nested'>ad frame</section>";

    await flushMutations();

    const hidden = shadow.querySelector<HTMLElement>("#ad-slot-nested");
    expect(hidden?.getAttribute("data-calmblock-hidden")).toBe("true");
    engine.clear();
  });

  it("does not hide strict-mode checkout content with ad-like words", async () => {
    loadFixture("cosmetic-strict-breakage.html");
    const engine = new CosmeticEngine();
    engine.apply();
    await flushMutations();

    const checkout = document.querySelector<HTMLElement>("#checkout-address-panel");
    const promoted = document.querySelector<HTMLElement>(".promoted-banner");
    if (!checkout || !promoted) {
      throw new Error("Fixture missing strict breakage elements");
    }

    expect(checkout.getAttribute("data-calmblock-hidden")).toBeNull();
    expect(promoted.getAttribute("data-calmblock-hidden")).toBe("true");
    engine.clear();
  });

  it("keeps login/payment/app-shell flows visible while still hiding decorative promos", async () => {
    loadFixture("cosmetic-strict-guardrails.html");
    const engine = new CosmeticEngine();
    engine.apply();
    await flushMutations();

    const appShell = document.querySelector<HTMLElement>("#app-shell");
    const login = document.querySelector<HTMLElement>("#login-panel");
    const payment = document.querySelector<HTMLElement>("#payment-step");
    const promo = document.querySelector<HTMLElement>("#decorative-promo");
    if (!appShell || !login || !payment || !promo) {
      throw new Error("Fixture missing strict guardrail elements");
    }

    expect(appShell.getAttribute("data-calmblock-hidden")).toBeNull();
    expect(login.getAttribute("data-calmblock-hidden")).toBeNull();
    expect(payment.getAttribute("data-calmblock-hidden")).toBeNull();
    expect(promo.getAttribute("data-calmblock-hidden")).toBe("true");
    engine.clear();
  });

  it("hides framework-generated consent overlays by data-testid", async () => {
    loadFixture("cosmetic-framework-consent.html");
    const engine = new CosmeticEngine();
    engine.apply();
    await flushMutations();

    const overlay = document.querySelector<HTMLElement>("[data-testid='cookie-banner-shell']");
    const content = document.querySelector<HTMLElement>(".article-main");
    if (!overlay || !content) {
      throw new Error("Fixture missing framework consent elements");
    }

    expect(overlay.getAttribute("data-calmblock-hidden")).toBe("true");
    expect(content.getAttribute("data-calmblock-hidden")).toBeNull();
    engine.clear();
  });

  it("scans a large mixed DOM within a bounded budget", async () => {
    const html = Array.from({ length: 1200 }, (_, index) => {
      if (index % 10 === 0) {
        return `<aside class='promoted-banner'>ad-${index}</aside>`;
      }
      if (index % 15 === 0) {
        return `<div data-testid='cookie-banner-${index}'>cookie ${index}</div>`;
      }
      return `<section class='content-card-${index}'>content ${index}</section>`;
    }).join("");
    document.body.innerHTML = html;

    const engine = new CosmeticEngine();
    const startedAt = Date.now();
    engine.apply();
    await flushMutations();
    const elapsedMs = Date.now() - startedAt;
    expect(elapsedMs).toBeLessThan(900);
    engine.clear();
  });
});
