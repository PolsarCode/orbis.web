"use client";

import { Dropdown } from "antd";
import { ChevronDown, Download } from "lucide-react";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import type { DesktopAsset } from "@/lib/desktop-release";

type Platform = "mac" | "windows" | "linux";

type Guide = "mac" | "windows" | "appimage" | "deb";

const labels: Record<Platform, string> = { mac: "Mac", windows: "Windows", linux: "Linux" };

const installers: Record<Platform, RegExp[]> = {
  mac: [/\.dmg$/i],
  windows: [/-setup\.exe$/i, /\.msi$/i],
  linux: [/\.AppImage$/i, /\.deb$/i],
};

const choices: { label: string; pattern: RegExp }[] = [
  { label: "macOS (Apple Silicon and Intel)", pattern: /\.dmg$/i },
  { label: "Windows", pattern: /-setup\.exe$/i },
  { label: "Linux (AppImage)", pattern: /\.AppImage$/i },
  { label: "Linux (.deb)", pattern: /\.deb$/i },
];

const guides: Record<Guide, { title: string; steps: ReactNode[] }> = {
  mac: {
    title: "Opening Orbis on your Mac",
    steps: [
      "Open the file you just downloaded, then drag Orbis into your Applications folder.",
      <>
        Open Orbis from Applications. macOS warns that it can’t check Orbis for malware, because
        Orbis isn’t registered with Apple yet. Click <strong>Done</strong>. Don’t click{" "}
        <strong>Move to Trash</strong>.
      </>,
      <>
        Open <strong>System Settings</strong>, go to <strong>Privacy &amp; Security</strong>, scroll
        down to the message about Orbis, and click <strong>Open Anyway</strong>. Confirm with your
        password or Touch ID.
      </>,
      "Orbis opens. You only do this once: Orbis installs its own updates from now on.",
    ],
  },
  windows: {
    title: "Installing Orbis on Windows",
    steps: [
      "Open the installer you just downloaded.",
      <>
        If Windows shows <strong>Windows protected your PC</strong>, click{" "}
        <strong>More info</strong>, then <strong>Run anyway</strong>. This shows up because Orbis
        isn’t registered with Microsoft yet.
      </>,
      "Follow the installer. Orbis opens when it’s done, and installs its own updates from now on.",
    ],
  },
  appimage: {
    title: "Running Orbis on Linux",
    steps: [
      <>
        Let the file run: right-click it, open <strong>Properties</strong>, and turn on{" "}
        <strong>Allow executing file as program</strong>. Or run{" "}
        <code className="rounded bg-rail-item px-1 text-[13px]">chmod +x Orbis_*.AppImage</code>{" "}
        in a terminal.
      </>,
      "Double-click the file to open Orbis.",
    ],
  },
  deb: {
    title: "Installing Orbis on Linux",
    steps: [
      <>
        In a terminal, go to the folder with the download and run{" "}
        <code className="rounded bg-rail-item px-1 text-[13px]">sudo apt install ./Orbis_*.deb</code>.
      </>,
      "Open Orbis from your app launcher.",
    ],
  },
};

function guideFor(name: string): Guide {
  if (/\.dmg$/i.test(name)) return "mac";
  if (/\.AppImage$/i.test(name)) return "appimage";
  if (/\.deb$/i.test(name)) return "deb";
  return "windows";
}

function detectPlatform(): Platform | null {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } };
  if (nav.userAgentData?.mobile) return null;
  const text = `${nav.userAgentData?.platform ?? ""} ${navigator.platform} ${navigator.userAgent}`.toLowerCase();
  if (/iphone|ipad|ipod|android/.test(text)) return null;
  if (text.includes("mac")) return navigator.maxTouchPoints > 1 ? null : "mac";
  if (text.includes("win")) return "windows";
  if (text.includes("linux") || text.includes("x11")) return "linux";
  return null;
}

function installerFor(platform: Platform, assets: DesktopAsset[]) {
  for (const pattern of installers[platform]) {
    const asset = assets.find(({ name }) => pattern.test(name));
    if (asset) return asset;
  }
  return null;
}

const noSubscription = () => () => {};

export function DesktopDownloadButton({ assets }: { assets: DesktopAsset[] }) {
  const platform = useSyncExternalStore(noSubscription, detectPlatform, () => null);
  const [opened, setOpened] = useState<DesktopAsset | null>(null);
  const installer = platform && installerFor(platform, assets);
  if (!platform || !installer) return null;

  const others = choices.flatMap(({ label, pattern }) => {
    const asset = assets.find(({ name }) => pattern.test(name));
    return asset && asset.url !== installer.url
      ? [
          {
            key: asset.name,
            label: (
              <a href={asset.url} onClick={() => setOpened(asset)}>
                {label}
              </a>
            ),
          },
        ]
      : [];
  });
  const guide = opened && guides[guideFor(opened.name)];

  return (
    <div className="flex flex-col items-center gap-2">
      <Atom.Button
        href={installer.url}
        variant="secondary"
        icon={<Download size={20} />}
        onClick={() => setOpened(installer)}
        className="h-14 rounded-full border-transparent bg-foreground px-8 text-base font-semibold text-background hover:border-transparent hover:bg-foreground/85 hover:text-background"
      >
        Download for {labels[platform]}
      </Atom.Button>
      {others.length > 0 && (
        <Dropdown trigger={["click"]} menu={{ items: others }}>
          <button
            type="button"
            className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-sm text-sm text-muted transition-colors hover:text-foreground"
          >
            Other platforms
            <ChevronDown size={14} aria-hidden />
          </button>
        </Dropdown>
      )}
      <Molecule.Dialog open={opened !== null} width={520} onCancel={() => setOpened(null)}>
        {opened && guide && (
          <div className="flex flex-col gap-6">
            <Molecule.ModalHeader
              eyebrow="Download"
              title={guide.title}
              description="Your download has started. Here’s how to open Orbis the first time."
            />
            <ol className="flex flex-col gap-4">
              {guide.steps.map((step, index) => (
                <li key={index} className="flex gap-3 text-sm leading-relaxed">
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent"
                  >
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted">
              Download didn’t start?{" "}
              <a href={opened.url} className="font-semibold text-accent hover:underline">
                Try again
              </a>
            </p>
          </div>
        )}
      </Molecule.Dialog>
    </div>
  );
}
