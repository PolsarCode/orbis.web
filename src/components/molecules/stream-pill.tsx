"use client";

import { TwitchFilled } from "@ant-design/icons";
import { Tooltip } from "antd";
import { useEffect, useState } from "react";
import type { NextStream } from "@/lib/api";

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

export function StreamPill({
  login,
  live,
  nextStream,
}: {
  login: string;
  live: boolean;
  nextStream: NextStream | null;
}) {
  if (live) {
    return (
      <a
        href={`https://www.twitch.tv/${login}`}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring flex h-9 shrink-0 items-center gap-2 rounded-lg whitespace-nowrap bg-[#9146FF] px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#772ce8]"
      >
        <TwitchFilled aria-hidden />
        Watch on Twitch
      </a>
    );
  }

  return nextStream ? <StreamCountdown login={login} next={nextStream} /> : null;
}
