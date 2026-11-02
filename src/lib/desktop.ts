export function inDesktopApp() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
