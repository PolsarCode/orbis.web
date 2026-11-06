import { Repeat } from "lucide-react";
import type { RepostedBy as RepostedByPeople } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { UserLink } from "./user-link";

export function RepostedBy({
  repostedBy,
  className = "",
}: {
  repostedBy: RepostedByPeople | null | undefined;
  className?: string;
}) {
  const [first] = repostedBy?.people ?? [];
  if (!repostedBy || !first) return null;
  const others = repostedBy.total - 1;

  return (
    <p className={`flex min-w-0 items-center gap-1.5 text-xs font-semibold text-muted ${className}`}>
      <Repeat size={13} aria-hidden className="shrink-0" />
      <span className="min-w-0 truncate">
        Reposted by{" "}
        <UserLink username={first.username} className="text-foreground">
          {displayName(first)}
        </UserLink>
        {others > 0 && ` and ${others} ${others === 1 ? "other" : "others"}`}
      </span>
    </p>
  );
}
