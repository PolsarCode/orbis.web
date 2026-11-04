export const HANDHELD = "(hover: none) and (pointer: coarse)";
export const INSTALL_CHANGE = "orbis:install-change";

export type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallWindow = Window & { orbisInstall?: InstallEvent | null };

export const installScript = `try{if(matchMedia("${HANDHELD}").matches){addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.orbisInstall=e;dispatchEvent(new Event("${INSTALL_CHANGE}"))});addEventListener("appinstalled",function(){window.orbisInstall=null;dispatchEvent(new Event("${INSTALL_CHANGE}"))})}}catch(e){}`;

export function canPromptInstall() {
  return Boolean((window as InstallWindow).orbisInstall);
}

export function takeInstallEvent() {
  const target = window as InstallWindow;
  const event = target.orbisInstall ?? null;
  target.orbisInstall = null;
  window.dispatchEvent(new Event(INSTALL_CHANGE));
  return event;
}
