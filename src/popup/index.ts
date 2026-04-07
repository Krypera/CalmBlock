import type { MessageResponse } from "../shared/messages";
import { GROUP_LABELS, PROTECTION_GROUPS } from "../shared/constants";
import { PermissionManager } from "../shared/permissionManager";
import type { PopupState } from "../shared/types";
import { webext } from "../shared/webext";

const globalToggle = document.querySelector<HTMLButtonElement>("#global-toggle");
const siteToggle = document.querySelector<HTMLButtonElement>("#site-toggle");
const globalStateEl = document.querySelector<HTMLElement>("#global-state");
const siteStateEl = document.querySelector<HTMLElement>("#site-state");
const siteStatus = document.querySelector<HTMLParagraphElement>("#site-status");
const blockedCountEl = document.querySelector<HTMLElement>("#blocked-count");
const categorySummary = document.querySelector<HTMLElement>("#category-summary");
const blockedNoteEl = document.querySelector<HTMLElement>("#blocked-note");
const enableLiveCountersBtn = document.querySelector<HTMLButtonElement>("#enable-live-counters");
const reloadHint = document.querySelector<HTMLElement>("#reload-hint");
const activeHostEl = document.querySelector<HTMLElement>("#active-host");

let lastState: PopupState | null = null;
let tabId: number | null = null;
let pendingToggle: "global" | "site" | null = null;
const permissionManager = new PermissionManager();

type PopupViewState =
  | "loading"
  | "ready"
  | "unsupported-page"
  | "no-active-tab"
  | "message-failed";

function setToggle(
  button: HTMLButtonElement | null,
  pill: HTMLElement | null,
  on: boolean,
  onText: string,
  offText: string
) {
  if (!button) {
    return;
  }
  button.classList.toggle("on", on);
  button.setAttribute("aria-pressed", String(on));
  if (pill) {
    pill.textContent = on ? onText : offText;
    pill.classList.toggle("off", !on);
  }
}

function setToggleInteractivity(
  button: HTMLButtonElement | null,
  enabled: boolean,
  pending: boolean
): void {
  if (!button) {
    return;
  }
  button.disabled = !enabled;
  button.classList.toggle("pending", pending);
  button.setAttribute("aria-busy", String(pending));
}

function updateToggleInteractivity(viewState: PopupViewState): void {
  const hasState = lastState !== null;
  const hasSiteContext = hasState && tabId !== null && Boolean(lastState?.host);
  const isPending = pendingToggle !== null;
  const controlsEnabled = viewState === "ready" && hasState && !isPending;
  setToggleInteractivity(globalToggle, controlsEnabled, pendingToggle === "global");
  setToggleInteractivity(
    siteToggle,
    controlsEnabled && hasSiteContext,
    pendingToggle === "site"
  );
}

function renderPopupViewState(viewState: PopupViewState, details?: string): void {
  if (viewState === "ready") {
    return;
  }
  if (categorySummary) {
    categorySummary.innerHTML = "";
  }

  if (viewState === "loading") {
    activeHostEl?.classList.add("hidden");
    if (siteStatus) {
      siteStatus.textContent = "Loading current tab state...";
    }
    if (blockedNoteEl) {
      blockedNoteEl.textContent = "Checking popup status...";
    }
    if (blockedCountEl) {
      blockedCountEl.textContent = "-";
    }
    updateToggleInteractivity(viewState);
    return;
  }

  if (viewState === "unsupported-page") {
    activeHostEl?.classList.add("hidden");
    if (siteStatus) {
      siteStatus.textContent =
        "This page is unsupported. Open a regular http(s) page to control per-site protection.";
    }
    if (blockedNoteEl) {
      blockedNoteEl.textContent = "Live counters are unavailable on unsupported pages.";
    }
    if (blockedCountEl) {
      blockedCountEl.textContent = "-";
    }
    updateToggleInteractivity(viewState);
    return;
  }

  if (viewState === "no-active-tab") {
    activeHostEl?.classList.add("hidden");
    if (siteStatus) {
      siteStatus.textContent = "No active tab found for this window.";
    }
    if (blockedNoteEl) {
      blockedNoteEl.textContent = "Switch to a tab and reopen CalmBlock.";
    }
    if (blockedCountEl) {
      blockedCountEl.textContent = "-";
    }
    updateToggleInteractivity(viewState);
    return;
  }

  if (siteStatus) {
    siteStatus.textContent = "Could not load popup state.";
  }
  activeHostEl?.classList.add("hidden");
  if (blockedNoteEl) {
    blockedNoteEl.textContent = details
      ? `Request failed: ${details}`
      : "Request failed. Try reopening the popup.";
  }
  if (blockedCountEl) {
    blockedCountEl.textContent = "-";
  }
  updateToggleInteractivity(viewState);
}

function renderCategories(state: PopupState) {
  if (!categorySummary) {
    return;
  }
  categorySummary.innerHTML = "";

  if (!state.activeProtectionGroups.length) {
    const empty = document.createElement("div");
    empty.className = "qb-summary-empty";
    empty.textContent = "No protection groups are currently enabled.";
    categorySummary.append(empty);
    return;
  }

  for (const key of state.activeProtectionGroups) {
    const chip = document.createElement("div");
    chip.className = "qb-chip";
    const label = document.createElement("span");
    label.className = "qb-chip-label";
    label.textContent = GROUP_LABELS[key];
    const value = document.createElement("strong");
    value.className = "qb-chip-value";
    value.textContent = state.liveStatsAvailable ? String(state.blockedByCategory[key]) : "Active";
    chip.append(label, value);
    categorySummary.append(chip);
  }
}

function updateLiveCounterPrompt(state: PopupState): void {
  if (!blockedNoteEl || !enableLiveCountersBtn) {
    return;
  }
  if (state.liveStatsAvailable) {
    enableLiveCountersBtn.classList.add("hidden");
    return;
  }

  if (state.liveStatsStatus === "permission-required") {
    enableLiveCountersBtn.classList.remove("hidden");
    return;
  }

  enableLiveCountersBtn.classList.add("hidden");
}

async function renderState(state: PopupState) {
  lastState = state;
  if (activeHostEl) {
    if (state.host) {
      activeHostEl.textContent = `Active host: ${state.host}`;
      activeHostEl.classList.remove("hidden");
    } else {
      activeHostEl.textContent = "";
      activeHostEl.classList.add("hidden");
    }
  }
  setToggle(globalToggle, globalStateEl, state.globalEnabled, "On", "Off");
  const siteStateLabel = state.siteDisabled
    ? "Paused"
    : state.globalEnabled
      ? "Protected"
      : "Enabled";
  setToggle(siteToggle, siteStateEl, state.siteEnabled, siteStateLabel, "Paused");
  if (siteStatus) {
    if (!state.globalEnabled) {
      siteStatus.textContent = state.siteDisabled
        ? "Global protection is off. This site is also paused."
        : "Global protection is off. Re-enable global protection to protect this site.";
    } else {
      siteStatus.textContent = state.effectiveProtectionEnabled
        ? "This site is currently protected."
        : "CalmBlock is disabled on this site.";
    }
  }
  if (blockedCountEl) {
    blockedCountEl.textContent = !state.liveStatsAvailable || state.blockedCount === null
      ? "-"
      : String(state.blockedCount);
  }
  if (blockedNoteEl) {
    blockedNoteEl.textContent = state.liveStatsMessage;
  }
  renderCategories(state);
  updateLiveCounterPrompt(state);
  updateToggleInteractivity("ready");
}

function showReloadHint(text: string): void {
  if (!reloadHint) {
    return;
  }
  reloadHint.textContent = text;
  reloadHint.classList.remove("hidden");
}

function hideReloadHint(): void {
  reloadHint?.classList.add("hidden");
}

async function loadPopupState() {
  renderPopupViewState("loading");
  hideReloadHint();
  try {
    const tabs = (await webext?.tabs?.query?.({ active: true, currentWindow: true })) ?? [];
    const activeTab = tabs[0];
    if (typeof activeTab?.id !== "number" || !activeTab.url) {
      lastState = null;
      tabId = null;
      renderPopupViewState("no-active-tab");
      return;
    }

    if (!/^https?:\/\//.test(activeTab.url)) {
      lastState = null;
      tabId = null;
      renderPopupViewState("unsupported-page");
      return;
    }

    tabId = activeTab.id;
    const response = (await webext?.runtime?.sendMessage?.({
      type: "GET_POPUP_STATE",
      tabId: activeTab.id,
      url: activeTab.url
    })) as MessageResponse | undefined;
    if (response?.ok && response.state) {
      await renderState(response.state);
      return;
    }
    lastState = null;
    renderPopupViewState("message-failed", response?.ok ? undefined : response?.error);
  } catch (error) {
    lastState = null;
    renderPopupViewState(
      "message-failed",
      error instanceof Error ? error.message : "Unknown runtime error"
    );
  }
}

globalToggle?.addEventListener("click", async () => {
  if (!lastState) {
    return;
  }
  pendingToggle = "global";
  updateToggleInteractivity("ready");
  try {
    const next = !lastState.globalEnabled;
    const response = (await webext?.runtime?.sendMessage?.({
      type: "TOGGLE_GLOBAL",
      enabled: next
    })) as MessageResponse | undefined;
    if (!response?.ok) {
      renderPopupViewState(
        "message-failed",
        response?.ok ? undefined : response?.error ?? "Global toggle failed"
      );
      hideReloadHint();
      return;
    }
    await loadPopupState();
    if (response.applySummary) {
      showReloadHint(formatApplySummary(response));
      return;
    }
    hideReloadHint();
  } catch (error) {
    renderPopupViewState(
      "message-failed",
      error instanceof Error ? error.message : "Global toggle failed"
    );
    hideReloadHint();
  } finally {
    pendingToggle = null;
    updateToggleInteractivity(lastState ? "ready" : "message-failed");
  }
});

siteToggle?.addEventListener("click", async () => {
  if (!lastState?.host || tabId === null) {
    return;
  }
  pendingToggle = "site";
  updateToggleInteractivity("ready");
  try {
    const next = !lastState.siteEnabled;
    const response = (await webext?.runtime?.sendMessage?.({
      type: "TOGGLE_SITE",
      host: lastState.host,
      enabled: next,
      tabId
    })) as MessageResponse | undefined;
    if (!response?.ok) {
      renderPopupViewState(
        "message-failed",
        response?.ok ? undefined : response?.error ?? "Site toggle failed"
      );
      hideReloadHint();
      return;
    }
    await loadPopupState();
    if (response.applySummary) {
      showReloadHint(formatApplySummary(response));
      return;
    }
    hideReloadHint();
  } catch (error) {
    renderPopupViewState(
      "message-failed",
      error instanceof Error ? error.message : "Site toggle failed"
    );
    hideReloadHint();
  } finally {
    pendingToggle = null;
    updateToggleInteractivity(lastState ? "ready" : "message-failed");
  }
});

enableLiveCountersBtn?.addEventListener("click", async () => {
  enableLiveCountersBtn.disabled = true;
  const granted = await permissionManager.requestFeedbackPermission();
  if (granted) {
    if (blockedNoteEl) {
      blockedNoteEl.textContent = "Live counters enabled. Refreshing status...";
    }
    await loadPopupState();
  } else if (blockedNoteEl) {
    blockedNoteEl.textContent =
      "Live counters stayed off. You can keep browsing with full blocking protection.";
  }
  enableLiveCountersBtn.disabled = false;
});

void loadPopupState();

function formatApplySummary(response: Extract<MessageResponse, { ok: true }>): string {
  const summary = response.applySummary;
  if (!summary) {
    return response.applyMode === "reload-recommended"
      ? "Reload needed: some already-open requests keep their old decision until refresh."
      : "";
  }

  const immediate = summary.immediate.length > 0
    ? "Applied now: popup state and new network requests follow your latest toggle."
    : "";
  const reloadNeeded = summary.afterReload.length > 0
    ? "Reload needed: resources that were already loaded before this toggle keep the previous decision."
    : "";
  return [immediate, reloadNeeded, summary.warning].filter(Boolean).join(" ");
}
