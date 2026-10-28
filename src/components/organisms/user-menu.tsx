"use client";

import { Modal, Popover } from "antd";
import {
  BookUser,
  Inbox,
  LogOut,
  MessageSquareWarning,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { useIsPhone } from "@/lib/use-is-phone";
import { useAuthStore } from "@/stores/auth-store";
import { useLayoutStore } from "@/stores/layout-store";
import { StatusPicker } from "./status-picker";
import { ThemeToggle } from "./theme-toggle";

export function UserMenu() {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const logout = useAuthStore((state) => state.logout);
  const setFeedbackOpen = useLayoutStore((state) => state.setFeedbackOpen);
  const [open, setOpen] = useState(false);
  const isPhone = useIsPhone();

  useEffect(() => {
    if (!useAuthStore.getState().profile) fetchProfile().catch(() => null);
  }, [fetchProfile]);

  function handleLogout() {
    setOpen(false);
    logout();
    router.push("/login");
  }

  const username = profile ? `@${profile.username}` : "Account";
  const menuRow =
    "focus-ring -mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-rail-item hover:text-foreground";

  const menu = (
    <div className="flex w-full flex-col gap-4 sm:w-[300px]">
      {profile && (
        <Link
          href={`/users/${profile.username}`}
          onClick={() => setOpen(false)}
          className="focus-ring -mx-2 flex min-w-0 items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-rail-item"
        >
          <Atom.Avatar
            label={profile.username}
            src={profile.avatarUrl}
            seed={profile.userId}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate">{profile.username}</span>
            <span className="truncate text-xs text-muted">{username}</span>
          </div>
        </Link>
      )}
      <hr className="border-divider" />
      <p className="text-xs text-muted uppercase">Status</p>
      <StatusPicker />
      <hr className="border-divider" />
      <p className="text-xs text-muted uppercase">Theme</p>
      <ThemeToggle block />
      <hr className="border-divider" />
      <Link
        href={profile ? `/users/${profile.username}` : "/profile"}
        onClick={() => setOpen(false)}
        className={menuRow}
      >
        <User size={18} />
        View profile
      </Link>
      <Link href="/settings" onClick={() => setOpen(false)} className={menuRow}>
        <Settings size={18} />
        Settings
      </Link>
      <Link href="/changelog" onClick={() => setOpen(false)} className={menuRow}>
        <Sparkles size={18} />
        What’s new
      </Link>
      <div className="flex flex-col gap-4 sm:hidden">
        <Molecule.ReadOnlyGate action="send feedback">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setFeedbackOpen(true);
            }}
            className={`${menuRow} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <MessageSquareWarning size={18} />
            Send feedback
          </button>
        </Molecule.ReadOnlyGate>
        <Link href="/reports" onClick={() => setOpen(false)} className={menuRow}>
          <Inbox size={18} />
          {profile?.isAdmin ? "View reports" : "My reports"}
        </Link>
        {profile?.isAdmin && (
          <Link href="/directory" onClick={() => setOpen(false)} className={menuRow}>
            <BookUser size={18} />
            Directory
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className={menuRow}
      >
        <LogOut size={18} />
        Log out
      </button>
    </div>
  );

  return (
    <>
      <Popover
        open={open && !isPhone}
        onOpenChange={setOpen}
        trigger="click"
        placement="bottomRight"
        arrow={false}
        align={{ offset: [0, 8] }}
        styles={{
          container: {
            padding: 20,
            borderRadius: 12,
            boxShadow: "none",
            border: "1px solid var(--divider)",
          },
        }}
        content={menu}
      >
        <button
          type="button"
          aria-label={`Account: ${username}`}
          data-tour="account"
          aria-expanded={open}
          className="focus-ring rounded-full"
        >
          <Atom.Avatar
            size="rail"
            label={profile?.username ?? "?"}
            src={profile?.avatarUrl}
            seed={profile?.userId ?? 0}
            presence={profile?.appearOffline ? "offline" : (profile?.status ?? "online")}
          />
        </button>
      </Popover>
      <Modal
        open={open && isPhone}
        onCancel={() => setOpen(false)}
        footer={null}
        title={null}
        closable={false}
        width={640}
        className="!top-3 !pb-0"
        styles={{ container: { padding: 20 } }}
      >
        {menu}
      </Modal>
    </>
  );
}
