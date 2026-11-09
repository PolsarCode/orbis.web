import type { Device } from "./api";

export const desktopScript = `try{if("__TAURI_INTERNALS__"in window&&/Mac/.test(navigator.platform))document.documentElement.dataset.desktop="mac"}catch(e){}`;

export function inDesktopApp() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function currentDevice(): Device {
  return inDesktopApp() ? "desktop" : "web";
}

export async function requestDesktopAttention() {
  if (!inDesktopApp()) return;
  const { getCurrentWindow, UserAttentionType } = await import("@tauri-apps/api/window");
  await getCurrentWindow().requestUserAttention(UserAttentionType.Informational);
}

async function invokeDesktop<T>(command: string) {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command);
}

export function startsOnLogin() {
  return invokeDesktop<boolean>("plugin:autostart|is_enabled");
}

export function setStartOnLogin(enabled: boolean) {
  return invokeDesktop<void>(enabled ? "plugin:autostart|enable" : "plugin:autostart|disable");
}

export async function setDesktopBadge(count: number) {
  if (!inDesktopApp()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setBadgeCount(count > 0 ? count : undefined);
}
