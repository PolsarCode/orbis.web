"use client";

import { Dropdown } from "antd";
import { ChevronDown, Download } from "lucide-react";
import { useSyncExternalStore } from "react";
import * as Atom from "@atom";
import type { DesktopAsset } from "@/lib/desktop-release";

type Platform = "mac" | "windows" | "linux";

const labels: Record<Platform, string> = { mac: "Mac", windows: "Windows", linux: "Linux" };

const installers: Record<Platform, RegExp[]> = {
  mac: [/\.dmg$/i],
  windows: [/-setup\.exe$/i, /\.msi$/i],
  linux: [/\.AppImage$/i, /\.deb$/i],
};

const choices = [
  { label: "macOS (Apple Silicon and Intel)", pattern: /\.dmg$/i },
  { label: "Windows", pattern: /-setup\.exe$/i },
  { label: "Linux (AppImage)", pattern: /\.AppImage$/i },
  { label: "Linux (.deb)", pattern: /\.deb$/i },
];

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
  const installer = platform && installerFor(platform, assets);
  if (!platform || !installer) return null;

  const others = choices.flatMap(({ label, pattern }) => {
    const asset = assets.find(({ name }) => pattern.test(name));
    return asset && asset.url !== installer.url
      ? [{ key: asset.name, label: <a href={asset.url}>{label}</a> }]
      : [];
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <Atom.Button
        href={installer.url}
        variant="secondary"
        icon={<Download size={20} />}
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
    </div>
  );
}
