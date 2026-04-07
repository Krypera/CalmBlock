export const COSMETIC_SELECTORS = [
  ".adsbox",
  ".sponsored",
  "iframe[src*='doubleclick']",
  "iframe[src*='googlesyndication']",
  "[class*='cookie-banner']",
  "[id*='cookie-banner']",
  "[data-testid*='cookie-banner']"
];

const CALMBLOCK_HIDDEN_ATTRIBUTE = "data-calmblock-hidden";
const CALMBLOCK_STYLE_ID = "calmblock-cosmetic-style";
const HEURISTIC_ATTRIBUTE_SELECTOR = "[id], [class], [data-testid], [data-test]";
const HEURISTIC_AD_PATTERNS = [
  /(^|[^a-z0-9])(adsbox|ad-slot|ad-banner|adbanner|sponsored|promoted|adcontainer)([^a-z0-9]|$)/i
];
const HEURISTIC_CONSENT_PATTERNS = [
  /(cookie|consent|gdpr|cmp|onetrust|didomi|sourcepoint|usercentrics|privacymanager)[-_:\s]?(banner|modal|overlay|prompt|wall|dialog|notice|gate)?/i
];
const BREAKAGE_GUARD_PATTERNS = [
  /(^|[^a-z0-9])(login|signin|sign-in|signup|sign-up|checkout|payment|billing|cart|account|auth|wallet|address|app-shell|dashboard|workspace)([^a-z0-9]|$)/i
];

interface InlineStyleSnapshot {
  display: string;
  displayPriority: string;
  visibility: string;
  visibilityPriority: string;
}

export class CosmeticEngine {
  private observer: MutationObserver | null = null;
  private readonly styleRoots = new Map<Document | ShadowRoot, HTMLStyleElement>();
  private readonly hiddenElements = new Map<HTMLElement, InlineStyleSnapshot>();
  private readonly pendingNodes = new Set<Node>();
  private scanScheduled = false;
  private scanGeneration = 0;

  apply(): void {
    if (this.observer) {
      return;
    }
    this.scanGeneration += 1;
    this.observer = new MutationObserver((mutations) => this.handleMutations(mutations));
    this.installStyle(document);
    if (document.documentElement) {
      this.observeRoot(document.documentElement);
    }
    this.scanSubtree(document);
  }

  clear(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.pendingNodes.clear();
    this.scanScheduled = false;
    this.scanGeneration += 1;

    for (const style of this.styleRoots.values()) {
      style.remove();
    }
    this.styleRoots.clear();

    for (const [element, snapshot] of this.hiddenElements.entries()) {
      restoreInlineStyle(element, snapshot);
      element.removeAttribute(CALMBLOCK_HIDDEN_ATTRIBUTE);
    }
    this.hiddenElements.clear();
  }

  private handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof HTMLElement) {
        this.scheduleNodeScan(mutation.target);
        continue;
      }

      for (const node of mutation.addedNodes) {
        this.scheduleNodeScan(node);
      }
    }
  }

  private scheduleNodeScan(node: Node): void {
    this.pendingNodes.add(node);
    if (this.scanScheduled) {
      return;
    }

    this.scanScheduled = true;
    const generation = this.scanGeneration;
    queueMicrotask(() => {
      if (!this.observer || generation !== this.scanGeneration) {
        this.pendingNodes.clear();
        this.scanScheduled = false;
        return;
      }
      this.scanScheduled = false;
      const pending = [...this.pendingNodes];
      this.pendingNodes.clear();
      for (const item of pending) {
        this.processNode(item);
      }
    });
  }

  private processNode(node: Node): void {
    if (node instanceof ShadowRoot) {
      this.installStyle(node);
      this.observeRoot(node);
      this.scanSubtree(node);
      return;
    }

    if (!(node instanceof Element)) {
      return;
    }

    this.hideIfMatched(node);
    if (node.shadowRoot) {
      this.installStyle(node.shadowRoot);
      this.observeRoot(node.shadowRoot);
      this.scanSubtree(node.shadowRoot);
    }
    this.scanSubtree(node);
  }

  private scanSubtree(root: Document | ShadowRoot | Element): void {
    if ("querySelectorAll" in root) {
      for (const element of root.querySelectorAll<HTMLElement>(COSMETIC_SELECTORS.join(","))) {
        this.hideElement(element);
      }

      for (const element of root.querySelectorAll<HTMLElement>(HEURISTIC_ATTRIBUTE_SELECTOR)) {
        this.hideIfMatched(element);
        if (element.shadowRoot) {
          this.installStyle(element.shadowRoot);
          this.observeRoot(element.shadowRoot);
          this.scanSubtree(element.shadowRoot);
        }
      }
    }

    if (root instanceof HTMLElement) {
      this.hideIfMatched(root);
      if (root.shadowRoot) {
        this.installStyle(root.shadowRoot);
        this.observeRoot(root.shadowRoot);
        this.scanSubtree(root.shadowRoot);
      }
    }
  }

  private hideIfMatched(element: Element): void {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    if (matchesCosmeticSelector(element) || matchesHeuristicSignal(element)) {
      this.hideElement(element);
    }
  }

  private hideElement(element: HTMLElement): void {
    if (element.getAttribute(CALMBLOCK_HIDDEN_ATTRIBUTE) === "true") {
      return;
    }

    if (!this.hiddenElements.has(element)) {
      this.hiddenElements.set(element, {
        display: element.style.getPropertyValue("display"),
        displayPriority: element.style.getPropertyPriority("display"),
        visibility: element.style.getPropertyValue("visibility"),
        visibilityPriority: element.style.getPropertyPriority("visibility")
      });
    }

    element.setAttribute(CALMBLOCK_HIDDEN_ATTRIBUTE, "true");
    element.style.setProperty("display", "none", "important");
    element.style.setProperty("visibility", "hidden", "important");
  }

  private installStyle(root: Document | ShadowRoot): void {
    if (this.styleRoots.has(root)) {
      return;
    }

    const style = document.createElement("style");
    style.id = CALMBLOCK_STYLE_ID;
    style.textContent = `${[
      ...COSMETIC_SELECTORS,
      `[${CALMBLOCK_HIDDEN_ATTRIBUTE}='true']`
    ].join(", ")} { display: none !important; visibility: hidden !important; }`;

    if (root instanceof Document) {
      (root.head || root.documentElement).append(style);
    } else {
      root.append(style);
    }

    this.styleRoots.set(root, style);
  }

  private observeRoot(root: Node): void {
    this.observer?.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "id", "data-testid", "data-test", "hidden", "aria-hidden"]
    });
  }
}

function matchesCosmeticSelector(element: Element): boolean {
  return COSMETIC_SELECTORS.some((selector) => element.matches(selector));
}

function matchesHeuristicSignal(element: HTMLElement): boolean {
  const descriptor = [
    element.id,
    typeof element.className === "string" ? element.className : "",
    element.getAttribute("data-testid") ?? "",
    element.getAttribute("data-test") ?? ""
  ]
    .join(" ")
    .toLowerCase();

  if (!descriptor) {
    return false;
  }

  const consentSignal = HEURISTIC_CONSENT_PATTERNS.some((pattern) => pattern.test(descriptor));
  if (consentSignal) {
    return !isGuardedCoreFlowElement(element, descriptor);
  }

  const adSignal = HEURISTIC_AD_PATTERNS.some((pattern) => pattern.test(descriptor));
  if (!adSignal) {
    return false;
  }

  if (isGuardedCoreFlowElement(element, descriptor)) {
    return false;
  }

  if (element.matches("main, article, form")) {
    return false;
  }

  return true;
}

function isGuardedCoreFlowElement(element: HTMLElement, descriptor: string): boolean {
  if (BREAKAGE_GUARD_PATTERNS.some((pattern) => pattern.test(descriptor))) {
    return true;
  }

  if (element.matches("[role='main'], [data-app-shell], [data-auth-root], [data-checkout-root]")) {
    return true;
  }

  if (element.querySelector("input[type='password']")) {
    return true;
  }

  if (element.querySelector("[autocomplete='cc-number'], [autocomplete='cc-csc'], [name*='card']")) {
    return true;
  }

  return false;
}

function restoreInlineStyle(element: HTMLElement, snapshot: InlineStyleSnapshot): void {
  restoreStyleProperty(element, "display", snapshot.display, snapshot.displayPriority);
  restoreStyleProperty(element, "visibility", snapshot.visibility, snapshot.visibilityPriority);
}

function restoreStyleProperty(
  element: HTMLElement,
  property: "display" | "visibility",
  value: string,
  priority: string
): void {
  if (!value) {
    element.style.removeProperty(property);
    return;
  }
  element.style.setProperty(property, value, priority);
}
