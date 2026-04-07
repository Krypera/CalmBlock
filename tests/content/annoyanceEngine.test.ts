import { describe, expect, it, vi } from "vitest";
import { AnnoyanceEngine } from "../../src/content/annoyanceEngine";
import { loadFixture } from "./fixtureHarness";

describe("AnnoyanceEngine", () => {
  it("clicks dismiss-like buttons inside nuisance containers", () => {
    loadFixture("annoyance-consent.html");
    const button = document.querySelector<HTMLButtonElement>("button");
    if (!button) {
      throw new Error("Fixture missing primary consent button");
    }
    const clickSpy = vi.spyOn(button, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).toHaveBeenCalled();
    engine.stop();
  });

  it("does not click unrelated buttons outside nuisance containers", () => {
    loadFixture("annoyance-nonconsent.html");
    const button = document.querySelector<HTMLButtonElement>("button");
    if (!button) {
      throw new Error("Fixture missing non-consent button");
    }
    const clickSpy = vi.spyOn(button, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).not.toHaveBeenCalled();
    engine.stop();
  });

  it("does not click submit buttons inside forms", () => {
    loadFixture("annoyance-form-submit.html");
    const submitButton = document.querySelector<HTMLButtonElement>("button[type='submit']");
    if (!submitButton) {
      throw new Error("Fixture missing submit button");
    }
    const clickSpy = vi.spyOn(submitButton, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).not.toHaveBeenCalled();
    engine.stop();
  });

  it("does not click hidden dismiss actions", () => {
    loadFixture("annoyance-hidden-action.html");
    const candidate = document.querySelector<HTMLButtonElement>("button");
    if (!candidate) {
      throw new Error("Fixture missing hidden candidate");
    }
    const clickSpy = vi.spyOn(candidate, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).not.toHaveBeenCalled();
    engine.stop();
  });

  it("does not click consent dialogs with only positive actions", () => {
    loadFixture("annoyance-positive-only.html");
    const candidate = document.querySelector<HTMLButtonElement>("button");
    if (!candidate) {
      throw new Error("Fixture missing positive-only candidate");
    }
    const clickSpy = vi.spyOn(candidate, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).not.toHaveBeenCalled();
    engine.stop();
  });

  it("clicks framework-style consent actions", () => {
    loadFixture("annoyance-framework-consent.html");
    const candidate = document.querySelector<HTMLButtonElement>("button[data-testid='consent-reject']");
    if (!candidate) {
      throw new Error("Fixture missing framework consent reject action");
    }
    const clickSpy = vi.spyOn(candidate, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).toHaveBeenCalled();
    engine.stop();
  });

  it("clicks dismiss actions inside open shadow-root consent dialogs", () => {
    loadFixture("annoyance-nonconsent.html");
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <section class="cookie-consent-banner" role="dialog" aria-modal="true">
        <button type="button">Reject all</button>
      </section>
    `;
    const candidate = shadow.querySelector<HTMLButtonElement>("button");
    if (!candidate) {
      throw new Error("Fixture missing shadow-root consent reject action");
    }
    const clickSpy = vi.spyOn(candidate, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).toHaveBeenCalled();
    engine.stop();
  });

  it("clicks dismiss actions only inside consent-related dialogs", () => {
    loadFixture("annoyance-close-consent.html");
    const candidate = document.querySelector<HTMLButtonElement>("button");
    if (!candidate) {
      throw new Error("Fixture missing consent dialog close button");
    }
    const clickSpy = vi.spyOn(candidate, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).toHaveBeenCalled();
    engine.stop();
  });

  it("does not click generic close buttons in unrelated dialogs", () => {
    loadFixture("annoyance-generic-modal.html");
    const candidate = document.querySelector<HTMLButtonElement>("button");
    if (!candidate) {
      throw new Error("Fixture missing generic modal close button");
    }
    const clickSpy = vi.spyOn(candidate, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).not.toHaveBeenCalled();
    engine.stop();
  });

  it("prioritizes reject actions when positive and reject text both exist", () => {
    loadFixture("annoyance-conflicting-actions.html");
    const candidate = document.querySelector<HTMLButtonElement>("button");
    if (!candidate) {
      throw new Error("Fixture missing conflicting-action candidate");
    }
    const clickSpy = vi.spyOn(candidate, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    engine.stop();
  });

  it("fully resets lifecycle state between stop/start cycles", () => {
    loadFixture("annoyance-consent.html");
    const candidate = document.querySelector<HTMLButtonElement>("button");
    if (!candidate) {
      throw new Error("Fixture missing restart candidate");
    }
    const clickSpy = vi.spyOn(candidate, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    engine.stop();
    engine.start();
    expect(clickSpy).toHaveBeenCalledTimes(2);
    engine.stop();
  });

  it("clicks multilingual reject actions (turkish/spanish)", () => {
    loadFixture("annoyance-nonconsent.html");
    document.body.innerHTML = `
      <section class="cookie-consent-modal" role="dialog" aria-modal="true">
        <button type="button" id="tr">Tumunu reddet</button>
        <button type="button" id="es">Rechazar todo</button>
      </section>
    `;
    const tr = document.querySelector<HTMLButtonElement>("#tr");
    const es = document.querySelector<HTMLButtonElement>("#es");
    if (!tr || !es) {
      throw new Error("Fixture missing multilingual candidates");
    }
    const trSpy = vi.spyOn(tr, "click");
    const esSpy = vi.spyOn(es, "click");

    const engine = new AnnoyanceEngine();
    engine.start();
    expect(trSpy.mock.calls.length + esSpy.mock.calls.length).toBe(1);
    engine.stop();
  });

  it("does not react while stopped and resumes after restart", async () => {
    loadFixture("annoyance-nonconsent.html");
    const engine = new AnnoyanceEngine();
    engine.start();
    engine.stop();

    const container = document.createElement("section");
    container.className = "cookie-consent-modal";
    container.setAttribute("role", "dialog");
    container.innerHTML = "<button type='button' id='late-reject'>Reject all</button>";
    document.body.append(container);

    const button = container.querySelector<HTMLButtonElement>("#late-reject");
    if (!button) {
      throw new Error("Missing late reject button");
    }
    const clickSpy = vi.spyOn(button, "click");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(clickSpy).not.toHaveBeenCalled();

    engine.start();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    engine.stop();
  });

  it("scans a large dialog-heavy DOM within a bounded budget", () => {
    const dialogs = Array.from({ length: 400 }, (_, index) => {
      return `<section class='cookie-consent-modal' role='dialog'><button type='button'>${
        index % 2 === 0 ? "Reject all" : "Accept all"
      }</button></section>`;
    }).join("");
    document.body.innerHTML = dialogs;

    const engine = new AnnoyanceEngine();
    const startedAt = Date.now();
    engine.start();
    const elapsedMs = Date.now() - startedAt;
    expect(elapsedMs).toBeLessThan(800);
    engine.stop();
  });
});
