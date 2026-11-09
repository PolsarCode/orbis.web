import type { ReactNode } from "react";
import * as Atom from "@atom";
import { IdentityCard } from "./identity-card";
import type { Device, PresenceStatus } from "@/lib/api";

export function PersonCard({
  userId,
  username,
  label,
  avatarUrl,
  coverUrl,
  isVerified = false,
  badge,
  presence,
  device,
  action,
  children,
}: {
  userId: number;
  username: string;
  label: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  isVerified?: boolean;
  badge?: ReactNode;
  presence?: PresenceStatus;
  device?: Device | null;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <IdentityCard
      coverUrl={coverUrl}
      avatar={
        <Atom.Avatar
          label={label}
          src={avatarUrl}
          seed={userId}
          presence={presence}
          device={device}
        />
      }
      title={
        <span className="flex min-w-0 items-center gap-1 text-[13px] font-semibold">
          <span className="truncate">{label}</span>
          {isVerified && <Atom.VerifiedBadge />}
        </span>
      }
      subtitle={`@${username}`}
      badge={badge}
      action={action}
      href={`/users/${username}`}
      linkLabel={`View ${label}’s profile`}
    >
      {children}
    </IdentityCard>
  );
}
