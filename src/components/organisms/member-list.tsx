"use client";

import { Dropdown, Popconfirm, type MenuProps } from "antd";
import { Ban, Check, Clock, MoreHorizontal, UserMinus, UserPlus, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { getMembers, type CommunityRole, type Member } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { useReadOnly } from "@/lib/read-only";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { useFriendsStore } from "@/stores/friends-store";
import { useMemberModeration } from "./member-moderation";

const profileButton = "h-6 shrink-0 gap-1 border-transparent px-2 text-xs hover:opacity-90";

export function FriendAction({
  userId,
  self,
  addLabel = "Add",
  buttonFor,
}: {
  userId: number;
  self: boolean;
  addLabel?: string;
  buttonFor?: string;
}) {
  const status = useFriendsStore((state) =>
    self
      ? "self"
      : !state.loaded
        ? "unknown"
        : state.friends.some((friend) => friend.userId === userId)
          ? "friend"
          : state.outgoing.some((user) => user.userId === userId)
            ? "sent"
            : state.incoming.some((user) => user.userId === userId)
              ? "incoming"
              : "none",
  );
  const addFriend = useFriendsStore((state) => state.addFriend);
  const removeFriend = useFriendsStore((state) => state.removeFriend);

  if (status === "unknown") return null;

  if (buttonFor && (status === "friend" || status === "sent")) {
    const friend = status === "friend";
    return (
      <Popconfirm
        title={
          friend
            ? `Remove ${buttonFor} from your friends?`
            : `Cancel your friend request to ${buttonFor}?`
        }
        okText={friend ? "Remove" : "Cancel request"}
        cancelText={friend ? "Cancel" : "Keep"}
        okButtonProps={{ danger: true }}
        onConfirm={() => removeFriend(userId).catch(() => null)}
      >
        <Atom.Button
          size="small"
          variant="secondary"
          icon={friend ? <Check size={12} /> : <Clock size={12} />}
          aria-label={
            friend
              ? `Friends with ${buttonFor}. Remove friend`
              : `Friend request sent to ${buttonFor}. Cancel request`
          }
          className={`${profileButton} ${
            friend ? "bg-success text-success-foreground" : "bg-rail-item text-foreground"
          }`}
        >
          {friend ? "Friends" : "Requested"}
        </Atom.Button>
      </Popconfirm>
    );
  }

  if (status === "self" || status === "friend" || status === "sent") {
    const pill = {
      self: { label: "You", tone: "neutral", icon: <UserRound size={12} /> },
      friend: { label: "Friends", tone: "success", icon: <Check size={12} /> },
      sent: { label: "Sent", tone: "neutral", icon: <Clock size={12} /> },
    } as const;
    const { label, tone, icon } = pill[status];
    return (
      <Atom.Pill tone={tone} size="md" icon={icon}>
        {label}
      </Atom.Pill>
    );
  }

  const title = status === "incoming" ? "Accept friend request" : "Add friend";

  return (
    <Molecule.ReadOnlyGate action="add friends">
      <Atom.Button
        size="small"
        variant={status === "incoming" ? "primary" : "secondary"}
        title={title}
        aria-label={title}
        icon={buttonFor ? <UserPlus size={12} /> : undefined}
        onClick={() => addFriend({ userId }).catch(() => null)}
        className={
          buttonFor
            ? `${profileButton} ${
                status === "incoming"
                  ? "bg-success text-success-foreground"
                  : "bg-info text-info-foreground"
              }`
            : "shrink-0"
        }
      >
        {status === "incoming" ? "Accept" : buttonFor ? "Add friend" : addLabel}
      </Atom.Button>
    </Molecule.ReadOnlyGate>
  );
}

function canModerate(myRole: CommunityRole | null, member: Member, myId?: number) {
  if (member.userId === myId || member.isOwner) return false;
  if (myRole === "owner") return true;
  return myRole === "admin" && !member.isAdmin;
}

function MemberMenu({
  communityId,
  member,
  onGone,
}: {
  communityId: number;
  member: Member;
  onGone: () => void;
}) {
  const readOnly = useReadOnly();
  const name = member.nickname ?? displayName(member);
  const target = { communityId, userId: member.userId, name };
  const { remove, ban, dialog } = useMemberModeration({ onRemoved: onGone, onBanned: onGone });

  const items: MenuProps["items"] = [
    {
      key: "remove",
      label: "Remove from community",
      icon: <UserMinus size={14} />,
      disabled: readOnly,
    },
    { key: "ban", label: "Ban", icon: <Ban size={14} />, danger: true, disabled: readOnly },
  ];

  return (
    <>
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items,
          onClick: ({ key }) => (key === "remove" ? remove(target) : ban(target)),
        }}
      >
        <button type="button" aria-label={`Options for ${name}`} className="icon-button cursor-pointer">
          <MoreHorizontal size={16} />
        </button>
      </Dropdown>
      {dialog}
    </>
  );
}

function MemberGroup({
  title,
  members,
  myId,
  myRole,
  communityId,
  onGone,
}: {
  title: string;
  members: Member[];
  myId?: number;
  myRole: CommunityRole | null;
  communityId: number;
  onGone: (userId: number) => void;
}) {
  if (members.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-bold text-muted uppercase">
        {title} / {members.length}
      </h3>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {members.map((member) => {
          const label = member.nickname ?? displayName(member);
          return (
            <li key={member.userId}>
              <Molecule.PersonCard
                userId={member.userId}
                username={member.username}
                label={label}
                avatarUrl={member.avatarUrl}
                coverUrl={member.coverUrl}
                isVerified={member.isVerified}
                badge={
                  member.isOwner ? (
                    <Atom.RoleBadge role="owner" />
                  ) : member.isAdmin ? (
                    <Atom.RoleBadge role="admin" />
                  ) : undefined
                }
                action={
                  myId !== undefined && (
                    <span className="flex items-center gap-1">
                      <FriendAction userId={member.userId} self={member.userId === myId} />
                      {canModerate(myRole, member, myId) && (
                        <MemberMenu
                          communityId={communityId}
                          member={member}
                          onGone={() => onGone(member.userId)}
                        />
                      )}
                    </span>
                  )
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MemberList({ communityId }: { communityId: number }) {
  const [members, setMembers] = useState<Member[]>([]);
  const myId = useAuthStore((state) => state.profile?.userId);
  const myRole = useCommunityStore(
    (state) => state.communities.find(({ id }) => id === communityId)?.role ?? null,
  );
  const gone = (userId: number) =>
    setMembers((current) => current.filter((member) => member.userId !== userId));

  useEffect(() => {
    const { token } = useAuthStore.getState();
    getMembers(token, communityId)
      .then(setMembers)
      .catch(() => null);
  }, [communityId]);

  const staff = members.filter((member) => member.isOwner || member.isAdmin);
  const everyoneElse = members.filter(
    (member) => !member.isOwner && !member.isAdmin,
  );

  return (
    <Molecule.TabSection title="Members" count={members.length}>
      <MemberGroup
        title="Owner & admins"
        members={staff}
        myId={myId}
        myRole={myRole}
        communityId={communityId}
        onGone={gone}
      />
      <MemberGroup
        title="Members"
        members={everyoneElse}
        myId={myId}
        myRole={myRole}
        communityId={communityId}
        onGone={gone}
      />
    </Molecule.TabSection>
  );
}
