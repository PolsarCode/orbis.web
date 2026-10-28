"use client";

import { DiscordFilled, TwitchFilled } from "@ant-design/icons";
import { Tooltip } from "antd";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import type { Community, CommunityImage, NextStream } from "@/lib/api";
import { useCommunityStore } from "@/stores/community-store";
import { CommunityLinkIcons } from "./community-links";
import { ReportButton } from "./report-content";

type ImageChange = (image: CommunityImage, file: File | null) => Promise<unknown>;

const STARTING_SOON_MS = 60 * 60 * 1000;

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function countdown(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds % 60}s`;
  return `${minutes}m ${seconds % 60}s`;
}

function StreamCountdown({ login, next }: { login: string; next: NextStream }) {
  const now = useNow();
  const startsAt = Date.parse(next.startsAt);
  const endsAt = next.endsAt ? Date.parse(next.endsAt) : startsAt + STARTING_SOON_MS;
  if (now >= endsAt) return null;

  const remaining = now < startsAt ? countdown(startsAt - now) : null;

  return (
    <Tooltip
      placement="bottom"
      classNames={{ root: "touch-visible" }}
      title={`Follow ${next.channel ?? login} on Twitch`}
    >
      <a
        href={`https://www.twitch.tv/${login}`}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring flex h-9 shrink-0 items-center gap-2 rounded-lg whitespace-nowrap bg-surface/85 px-3 text-xs font-semibold text-foreground tabular-nums backdrop-blur transition-colors hover:bg-surface"
      >
        <TwitchFilled aria-hidden className="text-[#9146FF]" />
        {remaining ? (
          <>
            <span className="sr-only">Next stream in </span>
            {remaining}
          </>
        ) : (
          "Starting soon"
        )}
      </a>
    </Tooltip>
  );
}

function StreamCorner({ community, live }: { community: Community; live: boolean }) {
  const login = community.twitchLogin;
  if (!login || community.showTwitchLive === false) return null;
  if (!live && !community.nextStream) return null;

  return live ? (
    <a
      href={`https://www.twitch.tv/${login}`}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring flex h-9 shrink-0 items-center gap-2 rounded-lg whitespace-nowrap bg-[#9146FF] px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#772ce8]"
    >
      <TwitchFilled aria-hidden />
      Watch on Twitch
    </a>
  ) : (
    community.nextStream && <StreamCountdown login={login} next={community.nextStream} />
  );
}

function DiscordCorner({ community }: { community: Community }) {
  const name = community.discordGuildName;
  const discord = community.discord;
  const online = community.showDiscordOnline === false ? null : (discord?.online ?? null);
  const inviteUrl = community.showDiscordInvite === false ? null : (discord?.inviteUrl ?? null);
  if (!name || (online === null && !inviteUrl)) return null;

  const className =
    "focus-ring flex h-9 shrink-0 items-center gap-2 rounded-lg whitespace-nowrap bg-surface/85 px-3 text-xs font-semibold text-foreground tabular-nums backdrop-blur";
  const content = (
    <>
      <DiscordFilled aria-hidden className="text-[#5865F2]" />
      <span className="sr-only">{name} on Discord: </span>
      {online === null ? "Join Discord" : `${online.toLocaleString()} online`}
    </>
  );

  return (
    <Tooltip
      placement="bottom"
      title={inviteUrl ? `Join ${name} on Discord` : `${name} on Discord`}
    >
      {inviteUrl ? (
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${className} transition-colors hover:bg-surface`}
        >
          {content}
        </a>
      ) : (
        <span className={className}>{content}</span>
      )}
    </Tooltip>
  );
}

const ICON_MAX_SIZE = 512;
const COVER_HEIGHT = { phone: 176, desktop: 256 };

function CommunityBadge({
  community,
  className,
  onImage,
  live,
}: {
  community: Community;
  className: string;
  onImage?: ImageChange;
  live?: { ring: string; large?: boolean };
}) {
  const badgeClass = `relative flex shrink-0 items-center justify-center rounded-full bg-rail-item font-display leading-none font-bold text-foreground ${className} ${live?.ring ?? ""}`;

  if (!onImage) {
    return (
      <span aria-hidden className={badgeClass}>
        <Atom.CommunityIcon name={community.name} src={community.iconUrl} />
        {live && <Atom.LiveTag large={live.large} />}
      </span>
    );
  }

  return (
    <Molecule.ImageMenu
      noun="icon"
      hasImage={Boolean(community.iconUrl)}
      onUpload={(file) => onImage("icon", file)}
      onRemove={() => onImage("icon", null)}
      crop={{ aspect: 1, round: true, maxSize: ICON_MAX_SIZE }}
    >
      {(busy) => (
        <button
          type="button"
          aria-label="Change community icon"
          className={`focus-ring group cursor-pointer ${badgeClass}`}
        >
          <Atom.CommunityIcon name={community.name} src={community.iconUrl} />
          <Atom.EditOverlay busy={busy} badge={false} />
          {live && <Atom.LiveTag large={live.large} />}
        </button>
      )}
    </Molecule.ImageMenu>
  );
}

export function CommunityHeader({
  community,
  collapsed,
  actions,
  adminAction,
  onImage,
}: {
  community: Community;
  collapsed: boolean;
  actions: ReactNode;
  adminAction?: ReactNode;
  onImage?: ImageChange;
}) {
  const storeLive = useCommunityStore(
    (state) => state.communities.find((item) => item.id === community.id)?.live,
  );
  const live = storeLive ?? community.live ?? false;
  const header = useRef<HTMLElement>(null);

  function coverAspect() {
    const desktop = window.matchMedia("(min-width: 40rem)").matches;
    return Molecule.coverAspect(
      header.current?.offsetWidth ?? 0,
      community.coverUrl
        ? (header.current?.offsetHeight ?? 0)
        : desktop
          ? COVER_HEIGHT.desktop
          : COVER_HEIGHT.phone,
    );
  }

  if (!community.coverUrl) {
    return (
      <header ref={header} className="flex h-14 shrink-0 items-center gap-6 border-b border-divider px-4 sm:h-[72px] sm:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <CommunityBadge
            community={community}
            onImage={onImage}
            className="h-8 w-8 text-[17px] sm:h-10 sm:w-10 sm:text-[22px]"
            live={live ? { ring: "ring-2 ring-danger ring-offset-2 ring-offset-background" } : undefined}
          />
          <Atom.Heading className="flex min-w-0 items-center gap-1.5">
            <span className="truncate">{community.name}</span>
            {community.isVerified && <Atom.VerifiedBadge size="heading" />}
          </Atom.Heading>
          {live && <span className="sr-only">Live on Twitch</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {adminAction}
          {onImage && (
            <Molecule.CoverButton
              hasImage={false}
              aspect={coverAspect}
              onUpload={(file) => onImage("cover", file)}
              onRemove={() => onImage("cover", null)}
            />
          )}
          <div className="flex items-center gap-1">
            <ReportButton type="community" id={community.id} ownerId={community.ownerId} />
            {actions}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      ref={header}
      className={`relative shrink-0 overflow-hidden border-b border-divider transition-[height] duration-300 ease-out motion-reduce:transition-none ${
        collapsed ? "h-14 sm:h-[72px]" : "h-44 sm:h-64"
      }`}
    >
      <Image
        src={community.coverUrl}
        alt=""
        fill
        unoptimized
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10" />
      <div
        className={`absolute inset-0 flex gap-3 px-4 sm:gap-4 sm:px-8 sm:pr-32 ${
          collapsed ? "items-center pr-28" : "items-end pb-4 sm:pb-6"
        }`}
      >
        <CommunityBadge
          community={community}
          onImage={onImage}
          className={`border-2 border-white/80 transition-[width,height] duration-300 motion-reduce:transition-none ${
            collapsed
              ? "h-8 w-8 text-[17px] sm:h-10 sm:w-10"
              : "h-14 w-14 text-[28px] sm:h-20 sm:w-20 sm:text-[40px]"
          }`}
          live={live ? { ring: "ring-2 ring-danger", large: !collapsed } : undefined}
        />
        <Atom.Heading
          className={`flex min-w-0 items-center gap-1.5 text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] ${
            collapsed ? "" : "sm:text-4xl"
          }`}
        >
          <span className={collapsed ? "truncate" : "max-sm:line-clamp-2 sm:truncate"}>
            {community.name}
          </span>
          {community.isVerified && <Atom.VerifiedBadge size="heading" />}
        </Atom.Heading>
        {live && <span className="sr-only">Live on Twitch</span>}
      </div>
      <div className="pointer-events-none absolute top-2.5 right-4 left-4 flex items-start gap-2 sm:top-4 sm:right-8 sm:left-8">
        {!collapsed && (
          <div className="pointer-events-auto flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <StreamCorner community={community} live={live} />
            <DiscordCorner community={community} />
            <CommunityLinkIcons name={community.name} links={community.links} />
          </div>
        )}
        <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-2">
          {adminAction && !collapsed && (
            <div className="flex items-center gap-1 rounded-lg bg-surface/85 p-0.5 backdrop-blur">
              {adminAction}
            </div>
          )}
          <div className="flex items-center gap-1 rounded-lg bg-surface/85 p-0.5 backdrop-blur empty:hidden">
            <ReportButton type="community" id={community.id} ownerId={community.ownerId} />
            {actions}
          </div>
        </div>
      </div>
      {onImage && !collapsed && (
        <Molecule.CoverButton
          hasImage
          aspect={coverAspect}
          onUpload={(file) => onImage("cover", file)}
          onRemove={() => onImage("cover", null)}
          className="absolute right-4 bottom-4 sm:right-8 sm:bottom-6"
        />
      )}
    </header>
  );
}
