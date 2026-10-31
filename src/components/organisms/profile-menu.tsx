"use client";

import { Dropdown, type MenuProps } from "antd";
import { Flag, MoreHorizontal, Settings, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ComponentProps } from "react";
import { useReadOnly } from "@/lib/read-only";
import { ProfileAdmin } from "./profile-admin";
import { ReportModal } from "./report-content";

type MenuItem = NonNullable<MenuProps["items"]>[number];

export function ProfileMenu({
  userId,
  isSelf,
  canReport,
  admin,
}: {
  userId: number;
  isSelf: boolean;
  canReport: boolean;
  admin?: Omit<ComponentProps<typeof ProfileAdmin>, "open" | "onClose">;
}) {
  const router = useRouter();
  const readOnly = useReadOnly();
  const [open, setOpen] = useState<"report" | "admin" | null>(null);

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
