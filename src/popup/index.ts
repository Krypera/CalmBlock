import type { MessageResponse } from "../shared/messages";
import { PROTECTION_GROUPS } from "../shared/constants";
import type { PopupState } from "../shared/types";
import { webext } from "../shared/webext";

const globalToggle = document.querySelector<HTMLButtonElement>("#global-toggle");
const siteToggle = document.querySelector<HTMLButtonElement>("#site-toggle");
const siteStatus = document.querySelector<HTMLParagraphElement>("#site-status");
const blockedCountEl = document.querySelector<HTMLElement>("#blocked-count");
const categorySummary = document.querySelector<HTMLElement>("#category-summary");
const reloadHint = document.querySelector<HTMLElement>("#reload-hint");

let lastState: PopupState | null = null;
let tabId: number | null = null;

function setToggle(button: HTMLButtonElement | null, on: boolean, onText: string, offText: string) {
  if (!button) {
    return;
  }
  button.classList.toggle("on", on);
  button.textContent = on ? onText : offText;
}

function renderCategories(state: PopupState) {
  if (!categorySummary) {
    return;
  }
  categorySummary.innerHTML = "";
  for (const key of PROTECTION_GROUPS.slice(0, 3)) {
    const chip = document.createElement("div");
    chip.className = "qb-chip";
    chip.textContent = `${key}: ${state.blockedByCategory[key]}`;
    categorySummary.append(chip);
  }
}

function renderState(state: PopupState) {
  lastState = state;
  setToggle(globalToggle, state.globalEnabled, "On", "Off");
  setToggle(siteToggle, state.siteEnabled, "Protected", "Paused");
  if (siteStatus) {
    siteStatus.textContent = state.siteEnabled
      ? "This site is currently protected."
      : "CalmBlock is disabled on this site.";
  }
  if (blockedCountEl) {
    blockedCountEl.textContent = state.blockedCount === null ? "-" : String(state.blockedCount);
  }
  renderCategories(state);
  if (reloadHint) {
    reloadHint.classList.toggle("hidden", !state.reloadRequired);
  }
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
  await webext?.runtime?.sendMessage?.({ type: "TOGGLE_GLOBAL", enabled: next });
  await loadPopupState();
});

siteToggle?.addEventListener("click", async () => {
  if (!lastState?.host || tabId === null) {
    return;
  }
  const next = !lastState.siteEnabled;
  await webext?.runtime?.sendMessage?.({
    type: "TOGGLE_SITE",
    host: lastState.host,
    enabled: next,
    tabId
  });
  await loadPopupState();
  if (reloadHint) {
    reloadHint.classList.remove("hidden");
  }
});

void loadPopupState();
