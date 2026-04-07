const REJECT_ACTION_TEXT_PATTERNS = [
  "reject all",
  "reject",
  "decline",
  "deny",
  "opt out",
  "necessary only",
  "use necessary",
  "continue without accepting",
  "reddet",
  "tumunu reddet",
  "hepsini reddet",
  "kabul etmiyorum",
  "rechazar",
  "rechazar todo",
  "rechazar todas",
  "denegar",
  "refuser",
  "tout refuser",
  "tout refuser et fermer",
  "ablehnen",
  "alles ablehnen",
  "verweigern",
  "rifiuta",
  "rifiuta tutto",
  "negar",
  "recusar",
  "recusar tudo",
  "afwijzen",
  "alles afwijzen",
  "odrzuc",
  "odrzuc wszystko"
];
const DISMISS_ACTION_TEXT_PATTERNS = [
  "no thanks",
  "dismiss",
  "close",
  "not now",
  "maybe later",
  "kapat",
  "simdi degil",
  "spater",
  "mas tarde",
  "tal vez despues",
  "plus tard",
  "chiudi"
];
const POSITIVE_ACTION_TEXT_PATTERNS = [
  "accept",
  "agree",
  "allow all",
  "allow cookies",
  "accept all",
  "continue",
  "ok",
  "i understand",
  "kabul et",
  "tumunu kabul et",
  "hepsini kabul et",
  "aceptar",
  "aceptar todo",
  "accepter",
  "tout accepter",
  "akzeptieren",
  "alle akzeptieren",
  "accetta",
  "accetta tutto",
  "aceitar",
  "aceitar tudo",
  "accepteren",
  "alles accepteren",
  "akceptuj",
  "zaakceptuj wszystko"
];
const CONSENT_CONTEXT_PATTERNS = [
  "cookie",
  "consent",
  "privacy",
  "gdpr",
  "tracking",
  "personal data",
  "manage preferences",
  "your choices",
  "legitimate interest",
  "cerez",
  "gizlilik",
  "onay",
  "kisisel veri",
  "privacidad",
  "consentimiento",
  "protection des donnees",
  "datenschutz",
  "einwilligung",
  "consenso",
  "dados pessoais",
  "toestemming",
  "zgoda"
];
const CONSENT_ATTRIBUTE_SELECTOR = [
  "[id*='cookie']",
  "[class*='cookie']",
  "[id*='consent']",
  "[class*='consent']",
  "[id*='gdpr']",
  "[class*='gdpr']",
  "[id*='cmp']",
  "[class*='cmp']",
  "[id*='onetrust']",
  "[class*='onetrust']",
  "[id*='didomi']",
  "[class*='didomi']",
  "[id*='usercentrics']",
  "[class*='usercentrics']",
  "[id*='sourcepoint']",
  "[class*='sourcepoint']",
  "[data-testid*='cookie']",
  "[data-testid*='consent']"
].join(", ");
const CONSENT_ROOT_SELECTOR = [
  CONSENT_ATTRIBUTE_SELECTOR,
  "[role='dialog']",
  "[role='alertdialog']",
  "dialog",
  "[aria-modal='true']"
].join(", ");

export class AnnoyanceEngine {
  private observer: MutationObserver | null = null;
  private frameRequested = false;
  private runId = 0;
  private clickedCandidates = new WeakSet<HTMLElement>();
  private observedRoots = new WeakSet<Node>();
  private shadowRoots = new Set<ShadowRoot>();

  start(): void {
    this.stop();
    this.runId += 1;
    const runId = this.runId;
    this.observer = new MutationObserver((mutations) => this.handleMutations(mutations, runId));
    this.observeRoot(document.documentElement);
    this.seedInitialShadowRoots();
    this.scan(runId);
  }

  stop(): void {
    this.runId += 1;
    this.observer?.disconnect();
    this.observer = null;
    this.frameRequested = false;
    this.clickedCandidates = new WeakSet<HTMLElement>();
    this.observedRoots = new WeakSet<Node>();
    this.shadowRoots = new Set<ShadowRoot>();
  }

  private scheduleScan(runId: number): void {
    if (this.frameRequested || runId !== this.runId) {
      return;
    }
    this.frameRequested = true;
    const schedule =
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : (callback: FrameRequestCallback) => window.setTimeout(callback, 0);
    schedule(() => {
      if (runId !== this.runId) {
        return;
      }
      this.frameRequested = false;
      this.scan(runId);
    });
  }

  private scan(runId: number): void {
    if (runId !== this.runId) {
      return;
    }
    for (const root of this.getScanRoots()) {
      const containers = root.querySelectorAll<HTMLElement>(CONSENT_ROOT_SELECTOR);
      for (const container of containers) {
        if (!isLikelyVisible(container)) {
          continue;
        }
        const context = describeConsentContext(container);
        if (!context.isConsentRelated) {
          continue;
        }

        const candidates = container.querySelectorAll<HTMLElement>(
          "button, [role='button'], input[type='button'], input[type='submit']"
        );
        for (const candidate of candidates) {
          if (this.clickedCandidates.has(candidate)) {
            continue;
          }
          if (shouldClickCandidate(candidate, context)) {
            this.clickedCandidates.add(candidate);
            candidate.click();
            break;
          }
        }
      }
    }
  }

  private getScanRoots(): Array<Document | ShadowRoot> {
    return [document, ...this.shadowRoots];
  }

  private handleMutations(mutations: MutationRecord[], runId: number): void {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        this.trackShadowRootsInNode(node);
      }
    }
    this.scheduleScan(runId);
  }

  private seedInitialShadowRoots(): void {
    for (const element of document.querySelectorAll<HTMLElement>("*")) {
      if (element.shadowRoot) {
        this.registerShadowRoot(element.shadowRoot);
      }
    }
  }

  private trackShadowRootsInNode(node: Node): void {
    if (!(node instanceof Element)) {
      return;
    }

    if (node instanceof HTMLElement && node.shadowRoot) {
      this.registerShadowRoot(node.shadowRoot);
    }

    for (const element of node.querySelectorAll<HTMLElement>("*")) {
      if (element.shadowRoot) {
        this.registerShadowRoot(element.shadowRoot);
      }
    }
  }

  private registerShadowRoot(root: ShadowRoot): void {
    if (this.shadowRoots.has(root)) {
      return;
    }
    this.shadowRoots.add(root);
    this.observeRoot(root);
  }

  private observeRoot(root: Node | null): void {
    if (!root || !this.observer || this.observedRoots.has(root)) {
      return;
    }

    this.observer.observe(root, {
      childList: true,
      subtree: true
    });
    this.observedRoots.add(root);
  }
}

function shouldClickCandidate(
  candidate: HTMLElement,
  context: { strongSignals: boolean }
): boolean {
  if (!isLikelyVisible(candidate)) {
    return false;
  }
  if (candidate instanceof HTMLInputElement && candidate.type === "submit") {
    return false;
  }
  if (candidate instanceof HTMLButtonElement && candidate.type === "submit" && candidate.closest("form")) {
    return false;
  }
  if (
    candidate instanceof HTMLButtonElement &&
    candidate.disabled
  ) {
    return false;
  }
  if (candidate.getAttribute("aria-disabled") === "true") {
    return false;
  }

  const text = normalizeText(
    [
      candidate.textContent ?? "",
      candidate.getAttribute("aria-label") ?? "",
      candidate.getAttribute("value") ?? ""
    ].join(" ")
  );
  if (!text) {
    return false;
  }

  if (REJECT_ACTION_TEXT_PATTERNS.some((pattern) => text.includes(pattern))) {
    return true;
  }

  if (POSITIVE_ACTION_TEXT_PATTERNS.some((pattern) => text.includes(pattern))) {
    return false;
  }

  return context.strongSignals && DISMISS_ACTION_TEXT_PATTERNS.some((pattern) => text.includes(pattern));
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function describeConsentContext(container: HTMLElement): {
  isConsentRelated: boolean;
  strongSignals: boolean;
} {
  const descriptor = normalizeText(
    [
      container.textContent ?? "",
      container.id,
      container.className,
      container.getAttribute("data-testid") ?? "",
      container.getAttribute("aria-label") ?? "",
      container.getAttribute("role") ?? ""
    ].join(" ")
  );
  const hasTextSignal = CONSENT_CONTEXT_PATTERNS.some((pattern) => descriptor.includes(pattern));
  const hasAttributeSignal = container.matches(CONSENT_ATTRIBUTE_SELECTOR);
  return {
    isConsentRelated: hasTextSignal || hasAttributeSignal,
    strongSignals: hasTextSignal || hasAttributeSignal
  };
}

function isLikelyVisible(element: HTMLElement): boolean {
  if (element.hidden) {
    return false;
  }
  if (element.getAttribute("aria-hidden") === "true") {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    style.pointerEvents === "none"
  ) {
    return false;
  }
  return true;
}
