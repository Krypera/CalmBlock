import type { PopupState } from "./types";

export type MessageRequest =
  | { type: "GET_POPUP_STATE"; tabId: number; url: string }
  | { type: "TOGGLE_GLOBAL"; enabled: boolean }
  | { type: "TOGGLE_SITE"; host: string; enabled: boolean; tabId: number }
  | { type: "IS_SITE_DISABLED"; host: string }
  | { type: "SITE_STATE_CHANGED"; enabled: boolean };

export type MessageResponse =
  | { ok: true; state?: PopupState; disabled?: boolean }
  | { ok: false; error: string };

