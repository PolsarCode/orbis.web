"use client";

import {
  GlobalOutlined,
  InstagramFilled,
  RedditOutlined,
  TikTokOutlined,
  XOutlined,
  YoutubeFilled,
} from "@ant-design/icons";
import { Dropdown, Tooltip } from "antd";
import { Link2 } from "lucide-react";
import type { ReactNode } from "react";
import * as Molecule from "@molecule";
import type { CommunityLinkPlatform, CommunityLinks } from "@/lib/api";

function KickIcon({ className }: { className?: string }) {
  return (
    <span role="img" aria-hidden className={className ? `anticon ${className}` : "anticon"}>
      <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor">
        <path d="M3 2h6v6h2V6h2V4h2V2h6v6h-2v2h-2v4h2v2h2v6h-6v-2h-2v-2h-2v-2H9v6H3z" />
      </svg>
    </span>
  );
}

function linkOn(...domains: string[]) {
  const hosts = domains.map((domain) => domain.replace(/\./g, "\\.")).join("|");
  return new RegExp(`^https://([a-z0-9-]+\\.)*(${hosts})(/\\S*)?$`, "i");
}

export const linkPlatforms: {
  key: CommunityLinkPlatform;
  label: string;
  icon: ReactNode;
  example: string;
  pattern: RegExp;
}[] = [
  {
    key: "x",
    label: "X",
    icon: <XOutlined />,
    example: "https://x.com/yourcommunity",
    pattern: linkOn("x.com", "twitter.com"),
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: <YoutubeFilled />,
    example: "https://www.youtube.com/@yourcommunity",
    pattern: linkOn("youtube.com", "youtu.be"),
  },
  {
    key: "kick",
    label: "Kick",
    icon: <KickIcon />,
    example: "https://kick.com/yourcommunity",
    pattern: linkOn("kick.com"),
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: <InstagramFilled />,
    example: "https://www.instagram.com/yourcommunity",
    pattern: linkOn("instagram.com"),
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: <TikTokOutlined />,
    example: "https://www.tiktok.com/@yourcommunity",
    pattern: linkOn("tiktok.com"),
  },
  {
    key: "reddit",
    label: "Reddit",
    icon: <RedditOutlined />,
    example: "https://www.reddit.com/r/yourcommunity",
    pattern: linkOn("reddit.com"),
  },
  {
    key: "website",
    label: "Website",
    icon: <GlobalOutlined />,
    example: "https://yourcommunity.com",
    pattern: /^https?:\/\/[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/i,
  },
];

export function normalizeLink(value: string) {
  const link = value.trim();
  if (!link || /^[a-z][a-z0-9+.-]*:/i.test(link)) return link;
  return `https://${link}`;
}

export function cleanLinks(values: CommunityLinks) {
  const links: CommunityLinks = {};
  for (const { key } of linkPlatforms) {
    const link = normalizeLink(values[key] ?? "");
    if (link) links[key] = link;
  }
  const invalid = linkPlatforms.some(({ key, pattern }) => links[key] && !pattern.test(links[key]));
  return { links, invalid };
}

export function CommunityLinkFields({
  values,
  onChange,
}: {
  values: CommunityLinks;
  onChange: (values: CommunityLinks) => void;
}) {
  const { links } = cleanLinks(values);
  return linkPlatforms.map(({ key, label, icon, example, pattern }) => {
    const wrong = Boolean(links[key] && !pattern.test(links[key]));
    return (
      <Molecule.FormField
        key={key}
        label={label}
        name={key}
        inputMode="url"
        autoComplete="off"
        maxLength={300}
        prefix={<span className="text-muted">{icon}</span>}
        placeholder={example}
        status={wrong ? "error" : undefined}
        extra={wrong ? `Use a link like ${example}` : undefined}
        value={values[key] ?? ""}
        onChange={(event) => onChange({ ...values, [key]: event.target.value })}
      />
    );
  });
}

const iconClassName =
  "focus-ring h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface/85 text-base text-foreground backdrop-blur transition-colors hover:bg-surface";

export function CommunityLinkIcons({ name, links }: { name: string; links?: CommunityLinks }) {
  const shown = linkPlatforms.flatMap((platform) => {
    const href = links?.[platform.key];
    return href && platform.pattern.test(href) ? [{ ...platform, href }] : [];
  });
  if (shown.length === 0) return null;
  const grouped = shown.length > 1;

  return (
    <>
      {grouped && (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: shown.map(({ key, label, icon, href }) => ({
              key,
              icon,
              label: (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {label}
                </a>
              ),
            })),
          }}
        >
          <button
            type="button"
            aria-label={`${name}’s links`}
            className={`${iconClassName} flex cursor-pointer sm:hidden`}
          >
            <Link2 size={16} aria-hidden />
          </button>
        </Dropdown>
      )}
      {shown.map(({ key, label, icon, href }) => (
        <Tooltip
          key={key}
          placement="bottom"
          title={label}
          styles={{ container: { textAlign: "center" } }}
        >
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={key === "website" ? `${name}’s website` : `${name} on ${label}`}
            className={`${iconClassName} ${grouped ? "hidden sm:flex" : "flex"}`}
          >
            {icon}
          </a>
        </Tooltip>
      ))}
    </>
  );
}
