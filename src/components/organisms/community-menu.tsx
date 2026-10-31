"use client";

import { App, Dropdown, type MenuProps } from "antd";
import {
  BadgeCheck,
  BadgeX,
  Flag,
  LogOut,
  MoreHorizontal,
  Settings,
  UserCog,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { canManage, setCommunityVerified, type Community } from "@/lib/api";
import { useReadOnly } from "@/lib/read-only";
import { useAuthStore } from "@/stores/auth-store";
import { useCommunityStore } from "@/stores/community-store";
import { useLeaveCommunity } from "./leave-community-button";
import { ReportModal } from "./report-content";

type MenuItem = NonNullable<MenuProps["items"]>[number];

export function useCommunityVerified(community: Community) {
  const stored = useCommunityStore(
    (state) => state.communities.find(({ id }) => id === community.id)?.isVerified,
  );
  return stored ?? community.isVerified;
}

export function useCommunityMenu(
  community: Community,
  onVerified?: (isVerified: boolean) => void,
): { items: MenuItem[]; modal: ReactNode } {
  const router = useRouter();
  const pathname = usePathname();
  const { message } = App.useApp();
  const readOnly = useReadOnly();
  const confirmLeave = useLeaveCommunity();
  const myId = useAuthStore((state) => state.profile?.userId);
  const headAdmin = useAuthStore((state) => Boolean(state.profile?.isHeadAdmin));
  const setVerified = useCommunityStore((state) => state.setVerified);
  const verified = useCommunityVerified(community);
  const [reporting, setReporting] = useState(false);
  const base = `/communities/${community.id}`;

  function leave() {
    confirmLeave(community, () => {
      if (pathname.startsWith(`${base}/me`) || pathname.startsWith(`${base}/settings`)) {
        router.push(community.isPublic ? base : "/");
      }
    });
  }

  async function toggleVerified() {
    const { token } = useAuthStore.getState();
    if (!token) return;
    try {
      const isVerified = await setCommunityVerified(token, community.id, !verified);
      setVerified(community.id, isVerified);
      onVerified?.(isVerified);
      message.success(
        isVerified ? `${community.name} is verified.` : `${community.name} is no longer verified.`,
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  }

  const groups: (MenuItem | false | null | undefined)[][] = [
    [
      community.role && {
        key: "me",
        label: "Your settings",
        icon: <UserCog size={14} />,
        onClick: () => router.push(`${base}/me`),
      },
      canManage(community) && {
        key: "settings",
        label: "Community settings",
        icon: <Settings size={14} />,
        onClick: () => router.push(`${base}/settings`),
      },
    ],
    [
      headAdmin && {
        key: "verify",
        label: verified ? "Remove verification" : "Verify community",
        icon: verified ? <BadgeX size={14} /> : <BadgeCheck size={14} />,
        onClick: toggleVerified,
      },
      myId !== undefined &&
        myId !== community.ownerId && {
          key: "report",
          label: "Report community",
          icon: <Flag size={14} />,
          disabled: readOnly,
          onClick: () => setReporting(true),
        },
    ],
    [
      community.role && {
        key: "leave",
        label: "Leave community",
        icon: <LogOut size={14} />,
        danger: true,
        disabled: readOnly,
        onClick: leave,
      },
    ],
  ];

  const items = groups
    .map((group) => group.filter((item): item is MenuItem => Boolean(item)))
    .filter((group) => group.length > 0)
    .flatMap((group, index) =>
      index === 0 ? group : [{ type: "divider" as const, key: `divider-${index}` }, ...group],
    );

  return {
    items,
    modal: (
      <ReportModal
        type="community"
        id={community.id}
        open={reporting}
        onClose={() => setReporting(false)}
      />
    ),
  };
}

export function CommunityMenu({
  community,
  onVerified,
}: {
  community: Community;
  onVerified?: (isVerified: boolean) => void;
}) {
  const { items, modal } = useCommunityMenu(community, onVerified);
  if (items.length === 0) return null;

  return (
    <>
      <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items }}>
        <button
          type="button"
          aria-label="Community options"
          data-tour={canManage(community) ? "community-settings" : undefined}
          className="icon-button cursor-pointer"
        >
          <MoreHorizontal size={20} />
        </button>
      </Dropdown>
      {modal}
    </>
  );
}
