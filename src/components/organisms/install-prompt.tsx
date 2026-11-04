"use client";

import { Share } from "lucide-react";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import * as Atom from "@atom";
import { inDesktopApp } from "@/lib/desktop";
import { canPromptInstall, HANDHELD, INSTALL_CHANGE, takeInstallEvent } from "@/lib/install-prompt";
import { useOnboardingStore } from "@/stores/onboarding-store";

const HIDDEN_KEY = "orbis:install-hidden";
const DAY_MS = 24 * 60 * 60 * 1000;
const SNOOZE_DAYS = 14;
const INSTALLED_DAYS = 365;

type Mode = "none" | "prompt" | "steps";

function hiddenUntil() {
  try {
    return Number(localStorage.getItem(HIDDEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function hideFor(days: number) {
  try {
    localStorage.setItem(HIDDEN_KEY, String(Date.now() + days * DAY_MS));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(INSTALL_CHANGE));
}

function installed() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function canAddToHomeScreen() {
  const agent = navigator.userAgent;
  const apple =
    /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
  return apple && /Safari\//.test(agent);
}

function readMode(): Mode {
  if (inDesktopApp() || !matchMedia(HANDHELD).matches || installed()) return "none";
  if (hiddenUntil() > Date.now()) return "none";
  if (canPromptInstall()) return "prompt";
  return canAddToHomeScreen() ? "steps" : "none";
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(INSTALL_CHANGE, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(INSTALL_CHANGE, onChange);
  };
}

export function InstallPrompt() {
  const mode = useSyncExternalStore(subscribe, readMode, () => "none" as Mode);
  const touring = useOnboardingStore((state) => state.tourOpen);
  const [steps, setSteps] = useState(false);

  if (mode === "none" || touring) return null;

  async function install() {
    if (mode === "steps") {
      setSteps(true);
      return;
    }
    const event = takeInstallEvent();
    if (!event) return;
    try {
      await event.prompt();
      const { outcome } = await event.userChoice;
      hideFor(outcome === "accepted" ? INSTALLED_DAYS : SNOOZE_DAYS);
    } catch {
      return;
    }
  }

  return (
    <section
      aria-label="Install Orbis"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md flex-col gap-3 rounded-xl border border-divider bg-surface p-4 shadow-xl transition duration-300 ease-out motion-reduce:transition-none starting:translate-y-6 starting:opacity-0 sm:right-auto sm:left-6 sm:w-96"
    >
      <div className="flex items-start gap-3">
        <Image
          src="/app-icons/192"
          alt=""
          width={48}
          height={48}
          unoptimized
          className="size-12 shrink-0 rounded-xl"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm font-semibold">Get the Orbis app</p>
          <p className="text-[13px] text-muted">
            Add Orbis to your home screen to open it full screen, like any other app.
          </p>
        </div>
      </div>
      {steps && (
        <ol className="flex list-decimal flex-col gap-1.5 rounded-lg bg-background/60 py-3 pr-3 pl-8 text-[13px]">
          <li>
            Tap <Share size={14} aria-hidden className="inline align-[-2px]" />{" "}
            <strong>Share</strong> in your browser. In Safari, it may be under the{" "}
            <strong>⋯</strong> button.
          </li>
          <li>
            Choose <strong>Add to Home Screen</strong>.
          </li>
          <li>
            Tap <strong>Add</strong>.
          </li>
        </ol>
      )}
      <div className="flex justify-end gap-2">
        <Atom.Button variant="text" onClick={() => hideFor(SNOOZE_DAYS)}>
          Not now
        </Atom.Button>
        {steps ? (
          <Atom.Button onClick={() => hideFor(INSTALLED_DAYS)}>Done</Atom.Button>
        ) : (
          <Atom.Button onClick={install}>Install</Atom.Button>
        )}
      </div>
    </section>
  );
}
