"use client";

import { App } from "antd";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { getBans, unbanMember, type Community, type CommunityBan } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";

export function CommunityBanSettings({ community }: { community: Community }) {
  const { modal, message } = App.useApp();
  const [bans, setBans] = useState<CommunityBan[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    let ignore = false;
    getBans(token, community.id)
      .then((result) => {
        if (!ignore) setBans(result);
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [community.id]);

  function confirmUnban(ban: CommunityBan) {
    const name = displayName(ban.user);
    modal.confirm({
      title: `Lift the ban on ${name}?`,
      content: "They’ll be able to join again. Anything deleted when they were banned stays deleted.",
      okText: "Lift ban",
      cancelText: "Cancel",
      onOk: () => {
        const { token } = useAuthStore.getState();
        if (!token) return Promise.reject(new Error("Please log in again."));
        return unbanMember(token, community.id, ban.user.id)
          .then(() =>
            setBans((current) => current?.filter(({ user }) => user.id !== ban.user.id) ?? null),
          )
          .catch((error: Error) => {
            message.error(error.message);
          });
      },
    });
  }

  return (
    <Molecule.SettingsSection
      title="Banned"
      aside={bans ? String(bans.length) : undefined}
      description="Banned people can’t join or use invites. They can still see what’s public, like anyone who isn’t logged in."
    >
      {failed ? (
        <Atom.ErrorMessage>Could not load banned people.</Atom.ErrorMessage>
      ) : !bans ? (
        <Atom.Loader />
      ) : bans.length === 0 ? (
        <p className="text-sm text-muted">No one is banned. Ban people from the members list.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-divider rounded-lg border border-divider">
          {bans.map((ban) => (
            <li key={ban.user.id} className="flex items-start gap-3 p-3">
              <Molecule.AuthorAvatar author={ban.user} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Molecule.UserLink username={ban.user.username} className="truncate text-sm font-semibold">
                  {displayName(ban.user)}
                </Molecule.UserLink>
                <span className="text-xs text-muted">
                  Banned by {ban.bannedBy ? displayName(ban.bannedBy) : "a deleted account"} ·{" "}
                  <time dateTime={ban.createdAt} title={new Date(ban.createdAt).toLocaleString()}>
                    {timeAgo(ban.createdAt)}
                  </time>
                </span>
                {ban.reason && <p className="text-[13px] whitespace-pre-wrap">{ban.reason}</p>}
              </div>
              <Molecule.ReadOnlyGate action="lift bans">
                <Atom.Button size="small" variant="secondary" onClick={() => confirmUnban(ban)}>
                  Lift ban
                </Atom.Button>
              </Molecule.ReadOnlyGate>
            </li>
          ))}
        </ul>
      )}
    </Molecule.SettingsSection>
  );
}
