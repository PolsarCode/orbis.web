import type { Device } from "./api";
import { HANDHELD } from "./install-prompt";

export const desktopScript = `try{if("__TAURI_INTERNALS__"in window&&/Mac/.test(navigator.platform))document.documentElement.dataset.desktop="mac"}catch(e){}`;

export function inDesktopApp() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function currentDevice(): Device {
  if (inDesktopApp()) return "desktop";
  return typeof window !== "undefined" && matchMedia(HANDHELD).matches ? "mobile" : "web";
}

export async function requestDesktopAttention() {
  if (!inDesktopApp()) return;
  const { getCurrentWindow, UserAttentionType } = await import("@tauri-apps/api/window");
  await getCurrentWindow().requestUserAttention(UserAttentionType.Informational);
}

async function invokeDesktop<T>(command: string, args?: Record<string, unknown>) {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

export function startsOnLogin() {
  return invokeDesktop<boolean>("plugin:autostart|is_enabled");
}

export function setStartOnLogin(enabled: boolean) {
  return invokeDesktop<void>(enabled ? "plugin:autostart|enable" : "plugin:autostart|disable");
}

export function startsMinimized() {
  return invokeDesktop<boolean>("starts_minimized");
}

export function setStartsMinimized(enabled: boolean) {
  return invokeDesktop<void>("set_starts_minimized", { enabled });
}

export async function setDesktopBadge(count: number) {
  if (!inDesktopApp()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setBadgeCount(count > 0 ? count : undefined);
}
