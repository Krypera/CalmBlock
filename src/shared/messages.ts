import type { PopupState } from "./types";

export interface ApplySummary {
  immediate: string[];
  afterReload: string[];
  warning?: string;
}

export type MessageRequest =
  | { type: "GET_POPUP_STATE"; tabId: number; url: string }
  | { type: "TOGGLE_GLOBAL"; enabled: boolean }
  | { type: "TOGGLE_SITE"; host: string; enabled: boolean; tabId: number }
  | { type: "IS_SITE_DISABLED"; host: string }
  | { type: "GET_EFFECTIVE_SITE_STATE"; host: string }
  | { type: "PROTECTION_STATE_CHANGED"; effectiveEnabled: boolean };

export type MessageResponse =
  | {
      ok: true;
      state?: PopupState;
      disabled?: boolean;
      effectiveEnabled?: boolean;
      applyMode?: "instant" | "reload-recommended";
      applySummary?: ApplySummary;
    }
  | { ok: false; error: string };
