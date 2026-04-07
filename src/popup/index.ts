import type { MessageResponse } from "../shared/messages";
import { PROTECTION_GROUPS } from "../shared/constants";
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
const reloadHint = document.querySelector<HTMLElement>("#reload-hint");

let lastState: PopupState | null = null;
let tabId: number | null = null;

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

function renderCategories(state: PopupState) {
  if (!categorySummary) {
    return;
  }
  categorySummary.innerHTML = "";
  if (!state.liveStatsAvailable) {
    const empty = document.createElement("div");
    empty.className = "qb-summary-empty";
    empty.textContent = "Live category counts require optional feedback permission.";
    categorySummary.append(empty);
    return;
  }

  for (const key of PROTECTION_GROUPS.slice(0, 3)) {
    const chip = document.createElement("div");
    chip.className = "qb-chip";
    const label = document.createElement("span");
    label.className = "qb-chip-label";
    label.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    const value = document.createElement("strong");
    value.className = "qb-chip-value";
    value.textContent = String(state.blockedByCategory[key]);
    chip.append(label, value);
    categorySummary.append(chip);
  }
}

function renderState(state: PopupState) {
  lastState = state;
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
    blockedNoteEl.textContent =
      !state.liveStatsAvailable
        ? "Live counts are available after optional feedback permission is granted."
        : state.blockedCount === null
          ? "Live counts are unavailable for this page."
        : state.blockedCount === 0
          ? "No blocked requests on this page yet."
          : "Live counts for the current tab.";
  }
  renderCategories(state);
  if (!state.reloadRequired) {
    hideReloadHint();
  }
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
  const tabs = (await webext?.tabs?.query?.({ active: true, currentWindow: true })) ?? [];
  const activeTab = tabs[0];
  if (!activeTab?.id || !activeTab.url) {
    return;
  }
  tabId = activeTab.id;
  const response = (await webext?.runtime?.sendMessage?.({
    type: "GET_POPUP_STATE",
    tabId: activeTab.id,
    url: activeTab.url
  })) as MessageResponse | undefined;
  if (response?.ok && response.state) {
    renderState(response.state);
  }
}

globalToggle?.addEventListener("click", async () => {
  if (!lastState) {
    return;
  }
  const next = !lastState.globalEnabled;
  const response = (await webext?.runtime?.sendMessage?.({
    type: "TOGGLE_GLOBAL",
    enabled: next
  })) as MessageResponse | undefined;
  await loadPopupState();
  if (response?.ok && response.applyMode === "instant") {
    hideReloadHint();
  }
});

siteToggle?.addEventListener("click", async () => {
  if (!lastState?.host || tabId === null) {
    return;
  }
  const next = !lastState.siteDisabled;
  const response = (await webext?.runtime?.sendMessage?.({
    type: "TOGGLE_SITE",
    host: lastState.host,
    enabled: next,
    tabId
  })) as MessageResponse | undefined;
  await loadPopupState();
  if (response?.ok && response.applyMode === "reload-recommended") {
    showReloadHint("Reload this tab to fully apply this site-level change.");
  }
});

void loadPopupState();
