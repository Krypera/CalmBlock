const ACTION_TEXT_PATTERNS = ["no thanks", "dismiss", "close", "not now", "reject all", "decline"];
const NUISANCE_CONTAINER_SELECTOR = [
  "[id*='cookie']",
  "[class*='cookie']",
  "[id*='consent']",
  "[class*='consent']",
  "[id*='gdpr']",
  "[class*='gdpr']",
  "[id*='cmp']",
  "[class*='cmp']",
  "[aria-modal='true'][class*='consent']"
].join(", ");

export class AnnoyanceEngine {
  private observer: MutationObserver | null = null;
  private frameRequested = false;

  start(): void {
    this.scan();
    this.observer = new MutationObserver(() => this.scheduleScan());
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private scheduleScan(): void {
    if (this.frameRequested) {
      return;
    }
    this.frameRequested = true;
    requestAnimationFrame(() => {
      this.frameRequested = false;
      this.scan();
    });
  }

  private scan(): void {
    const containers = document.querySelectorAll<HTMLElement>(NUISANCE_CONTAINER_SELECTOR);
    for (const container of containers) {
      if (!isLikelyVisible(container)) {
        continue;
      }
      const candidates = container.querySelectorAll<HTMLElement>("button, [role='button'], [aria-label]");
      for (const candidate of candidates) {
        if (shouldClickCandidate(candidate)) {
          candidate.click();
        }
      }
    }
  }
}

function shouldClickCandidate(candidate: HTMLElement): boolean {
  if (!isLikelyVisible(candidate)) {
    return false;
  }
  if (candidate instanceof HTMLButtonElement && candidate.type === "submit" && candidate.closest("form")) {
    return false;
  }
  const text = normalizeText(
    `${candidate.textContent ?? ""} ${candidate.getAttribute("aria-label") ?? ""}`
  );
  if (!text) {
    return false;
  }
  return ACTION_TEXT_PATTERNS.some((pattern) => text.includes(pattern));
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function isLikelyVisible(element: HTMLElement): boolean {
  if (element.hidden) {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  return true;
}
