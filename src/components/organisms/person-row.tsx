"use client";

import { TwitchFilled } from "@ant-design/icons";
import { Tooltip } from "antd";
import { Gamepad2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import type { ChatPerson } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { useAuthStore } from "@/stores/auth-store";
import { useFriendsStore } from "@/stores/friends-store";
import { MessageButton } from "./chat-dock";
import type { PresenceStatus } from "@/lib/api";

export function PersonRow({
  person,
  label = displayName(person),
  presence,
  badge,
  subtitle = `@${person.username}`,
  trailing,
  actions,
  playing,
  twitchLogin,
}: {
  person: ChatPerson;
  label?: string;
  presence?: PresenceStatus;
  badge?: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  actions?: ReactNode;
  playing?: string | null;
  twitchLogin?: string | null;
}) {
  const me = useAuthStore((state) => state.profile?.userId);
  const liveGame = useFriendsStore((state) => state.games[person.userId]);
  const liveTwitch = useFriendsStore((state) => state.twitchLogins[person.userId]);
  const self = person.userId === me;
  const game =
    presence === undefined || presence === "offline"
      ? null
      : liveGame !== undefined
        ? liveGame
        : playing;
  const twitch =
    presence === "streaming" ? (liveTwitch !== undefined ? liveTwitch : twitchLogin) : null;

  return (
    <li className="group flex flex-col gap-2 py-2">
      <div className="flex items-center gap-3">
        <div
          className={`flex min-w-0 flex-1 items-center gap-3 ${
            presence === "offline" ? "opacity-60" : ""
          }`}
        >
          <Link
            href={`/users/${person.username}`}
            aria-label={`${label}’s profile`}
            tabIndex={-1}
            className="shrink-0 rounded-full"
          >
            <Atom.Avatar
              size="sm"
              label={label}
              src={person.avatarUrl}
              seed={person.userId}
              presence={presence}
            />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex min-w-0 items-center gap-1.5">
              <Molecule.UserLink
                username={person.username}
                verified={person.isVerified}
                className="truncate text-[13px] font-semibold"
              >
                {label}
              </Molecule.UserLink>
              {badge}
            </span>
            <span className="truncate text-xs text-muted">{subtitle}</span>
            {game && (
              <span className="flex min-w-0 items-center gap-1 text-xs font-semibold text-online">
                <Gamepad2 size={13} aria-hidden className="shrink-0" />
                <span className="truncate">Playing {game}</span>
              </span>
            )}
          </div>
        </div>
        {(twitch || !self) && (
          <div className="flex items-center gap-1">
            {twitch && (
              <Tooltip title="Watch on Twitch">
                <a
                  href={`https://www.twitch.tv/${twitch}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Watch ${label} on Twitch`}
                  className="icon-button text-[#9146FF]"
                >
                  <TwitchFilled />
                </a>
              </Tooltip>
            )}
            {!self && <MessageButton person={person} compact />}
          </div>
        )}
        {trailing}
      </div>
      {actions && <div className="flex gap-2 pl-11">{actions}</div>}
    </li>
  );
}
