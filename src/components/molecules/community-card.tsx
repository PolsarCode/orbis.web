import type { ReactNode } from "react";
import * as Atom from "@atom";
import { IdentityCard } from "./identity-card";

export function CommunityCard({
  name,
  iconUrl,
  coverUrl,
  memberCount,
  isVerified = false,
  badge,
  action,
  href,
  children,
}: {
  name: string;
  iconUrl: string | null;
  coverUrl: string | null;
  memberCount: number;
  isVerified?: boolean;
  badge?: ReactNode;
  action?: ReactNode;
  href?: string;
  children?: ReactNode;
}) {
  const icon = (
    <span
      aria-hidden
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-rail-item font-display text-[20px] leading-none font-bold"
    >
      <Atom.CommunityIcon name={name} src={iconUrl} />
    </span>
  );

  return (
    <IdentityCard
      coverUrl={coverUrl}
      avatar={icon}
      title={
        <span className="flex min-w-0 items-center gap-1 text-[13px] font-semibold">
          <span className="max-sm:line-clamp-2 sm:truncate">{name}</span>
          {isVerified && <Atom.VerifiedBadge />}
        </span>
      }
      subtitle={`${memberCount.toLocaleString()} ${memberCount === 1 ? "member" : "members"}`}
      badge={badge}
      action={action}
      href={href}
      linkLabel={`Open ${name}`}
    >
      {children}
    </IdentityCard>
  );
}
