"use client";

import { useEffect, useState } from "react";
import * as Atom from "@atom";
import { getMembers, type Member, type PresenceStatus } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { useAuthStore } from "@/stores/auth-store";
import { useFriendsStore } from "@/stores/friends-store";
import { useLayoutStore } from "@/stores/layout-store";
import { PersonRow } from "./person-row";
import { PanelHeading } from "./side-panel";

function PresenceGroup({
  title,
  members,
  online,
  emptyText,
}: {
  title: string;
  members: Member[];
  online: boolean;
  emptyText: string;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[11px] font-bold text-muted uppercase">
        {title} / {members.length}
      </h3>
      {members.length === 0 ? (
        <p className="py-2 text-xs text-muted">{emptyText}</p>
      ) : (
        <ul className="flex flex-col">
          {members.map((member) => (
            <PersonRow
              key={member.userId}
              person={member}
              label={member.nickname ?? displayName(member)}
              presence={online ? member.status : "offline"}
              playing={member.playing}
              twitchLogin={member.twitchLogin}
              badge={
                (member.isOwner || member.isAdmin) && (
                  <Atom.RoleBadge role={member.isOwner ? "owner" : "admin"} />
                )
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export function MemberPresence({
  communityId,
  seeAllHref,
}: {
  communityId: number;
  seeAllHref?: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const profile = useAuthStore((state) => state.profile);
  const presence = useFriendsStore((state) => state.presence);
  const statuses = useFriendsStore((state) => state.statuses);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    getMembers(token, communityId)
      .then(setMembers)
      .catch(() => null);
  }, [communityId]);

  const isOnline = (member: Member) =>
    member.userId === profile?.userId
      ? !profile.appearOffline
      : (presence[member.userId] ?? member.online);
  const statusOf = (member: Member): PresenceStatus => {
    const status = statuses[member.userId] ?? member.status;
    if (member.userId !== profile?.userId) return status;
    if (profile.appearOffline) return "offline";
    return status === "streaming" ? "streaming" : profile.status;
  };
  const withStatus = members.map((member) => ({ ...member, status: statusOf(member) }));
  const streaming = withStatus.filter((member) => member.status === "streaming");
  const online = withStatus.filter((member) => member.status !== "streaming" && isOnline(member));
  const offline = withStatus.filter((member) => member.status !== "streaming" && !isOnline(member));

  return (
    <>
      <PanelHeading title={`Members / ${members.length}`} label="Members" />
      {streaming.length > 0 && (
        <PresenceGroup
          title="Streaming"
          members={streaming}
          online
          emptyText="No one is streaming right now."
        />
      )}
      <PresenceGroup
        title="Online"
        members={online}
        online
        emptyText="No one is online right now."
      />
      <PresenceGroup
        title="Offline"
        members={offline}
        online={false}
        emptyText="Everyone is online."
      />
      {seeAllHref && (
        <div onClick={() => useLayoutStore.getState().closeDrawer()}>
          <Atom.ButtonLink href={seeAllHref} variant="secondary" block>
            See all members
          </Atom.ButtonLink>
        </div>
      )}
    </>
  );
}
