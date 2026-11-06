"use client";

import { App, Dropdown, type MenuProps } from "antd";
import { Ban, Flag, MoreHorizontal, Settings, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { useReadOnly } from "@/lib/read-only";
import { ProfileAdmin } from "./profile-admin";
import { ReportModal } from "./report-content";

type MenuItem = NonNullable<MenuProps["items"]>[number];

type Safety = {
  username: string;
  blocked: boolean;
  muted: boolean;
  onBlockedChange: (blocked: boolean) => Promise<void>;
  onMutedChange: (muted: boolean) => Promise<void>;
};

export function ProfileMenu({
  userId,
  isSelf,
  canReport,
  safety,
  admin,
}: {
  userId: number;
  isSelf: boolean;
  canReport: boolean;
  safety?: Safety;
  admin?: Omit<ComponentProps<typeof ProfileAdmin>, "open" | "onClose">;
}) {
  const router = useRouter();
  const readOnly = useReadOnly();
  const { modal, message } = App.useApp();
  const [open, setOpen] = useState<"report" | "admin" | null>(null);

  function toggleMute({ username, muted, onMutedChange }: Safety) {
    onMutedChange(!muted)
      .then(() => message.success(muted ? `Unmuted @${username}.` : `Muted @${username}.`))
      .catch((error: Error) => message.error(error.message));
  }

  function toggleBlock({ username, blocked, onBlockedChange }: Safety) {
    if (blocked) {
      onBlockedChange(false)
        .then(() => message.success(`Unblocked @${username}.`))
        .catch((error: Error) => message.error(error.message));
      return;
    }
    modal.confirm({
      title: `Block @${username}?`,
      content:
        "You won’t see each other’s posts, comments or profile, and they can’t message you or send a friend request. They won’t be told.",
      okText: "Block",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () =>
        onBlockedChange(true)
          .then(() => message.success(`Blocked @${username}.`))
          .catch((error: Error) => {
            message.error(error.message);
          }),
    });
  }

  const items: MenuItem[] = [
    ...(isSelf
      ? [
          {
            key: "settings",
            label: "Profile settings",
            icon: <Settings size={14} />,
            onClick: () => router.push("/settings"),
          },
        ]
      : []),
    ...(safety
      ? [
          ...(safety.blocked
            ? []
            : [
                {
                  key: "mute",
                  label: safety.muted ? `Unmute @${safety.username}` : `Mute @${safety.username}`,
                  icon: safety.muted ? <Volume2 size={14} /> : <VolumeX size={14} />,
                  onClick: () => toggleMute(safety),
                },
              ]),
          {
            key: "block",
            label: safety.blocked ? `Unblock @${safety.username}` : `Block @${safety.username}`,
            icon: <Ban size={14} />,
            danger: !safety.blocked,
            onClick: () => toggleBlock(safety),
          },
        ]
      : []),
    ...(canReport
      ? [
          {
            key: "report",
            label: "Report profile",
            icon: <Flag size={14} />,
            disabled: readOnly,
            onClick: () => setOpen("report"),
          },
        ]
      : []),
    ...(admin
      ? [
          { type: "divider" as const },
          {
            key: "admin",
            label: "Admin tools",
            icon: <ShieldCheck size={14} />,
            onClick: () => setOpen("admin"),
          },
        ]
      : []),
  ];

  if (items.length === 0) return null;

  return (
    <>
      <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items }}>
        <button type="button" aria-label="Profile options" className="icon-button cursor-pointer">
          <MoreHorizontal size={20} />
        </button>
      </Dropdown>
      {canReport && (
        <ReportModal
          type="user"
          id={userId}
          open={open === "report"}
          onClose={() => setOpen(null)}
        />
      )}
      {admin && <ProfileAdmin {...admin} open={open === "admin"} onClose={() => setOpen(null)} />}
    </>
  );
}
