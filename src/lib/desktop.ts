export const desktopScript = `try{if("__TAURI_INTERNALS__"in window&&/Mac/.test(navigator.platform))document.documentElement.dataset.desktop="mac"}catch(e){}`;

export function inDesktopApp() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
