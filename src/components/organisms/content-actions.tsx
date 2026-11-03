"use client";

import { App, Dropdown, type MenuProps } from "antd";
import {
  Ban,
  Bookmark,
  BookmarkX,
  Flag,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  UserMinus,
} from "lucide-react";
import { useState } from "react";
import * as Molecule from "@molecule";
import { useReadOnly } from "@/lib/read-only";
import { useAuthStore } from "@/stores/auth-store";
import { ReportButton, ReportModal } from "./report-content";

type EditableType = "post" | "comment" | "forum_post";

const nouns: Record<EditableType, string> = {
  post: "post",
  comment: "comment",
  forum_post: "post",
};

const deleteNotes: Record<EditableType, string> = {
  post: "Its comments are deleted with it. This can’t be undone.",
  comment: "This can’t be undone. If it has replies, they stay.",
  forum_post: "This can’t be undone.",
};

export function ContentActions({
  type,
  id,
  ownerId,
  canDelete = false,
  onEdit,
  onDelete,
  deleteNote,
  pin,
  bookmark,
  moderation,
  variant = "icon",
  className = "",
}: {
  type: EditableType;
  id: number;
  ownerId: number;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  deleteNote?: string;
  pin?: { pinned: boolean; onToggle: () => Promise<void> };
  bookmark?: { bookmarked: boolean; onToggle: () => Promise<void> };
  moderation?: { name: string; remove?: () => void; ban?: () => void };
  variant?: "icon" | "text";
  className?: string;
}) {
  const myId = useAuthStore((state) => state.profile?.userId);
  const readOnly = useReadOnly();
  const { modal, message } = App.useApp();
  const [reporting, setReporting] = useState(false);
  const own = myId !== undefined && myId === ownerId;
  const deletable = Boolean(onDelete) && (own || canDelete);
  const canReport = myId !== undefined && !own;
  const bookmarkable = myId !== undefined && Boolean(bookmark);
  const moderating = variant === "icon" && Boolean(moderation?.remove || moderation?.ban);

  if (variant === "text" && !deletable) {
    return <ReportButton type={type} id={id} ownerId={ownerId} className={className} />;
  }
  if (!deletable && !canReport && !bookmarkable) return null;

  function confirmDelete() {
    modal.confirm({
      title: `Delete this ${nouns[type]}?`,
      content: deleteNote ?? deleteNotes[type],
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () =>
        onDelete?.().catch((error: Error) => {
          message.error(error.message);
        }),
    });
  }

  if (variant === "text") {
    const textButton =
      "focus-ring cursor-pointer rounded-sm px-1 text-xs font-semibold text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50";
    return (
      <>
        {own && onEdit && (
          <Molecule.ReadOnlyGate action="edit">
            <button type="button" onClick={onEdit} className={`${textButton} hover:text-foreground`}>
              Edit
            </button>
          </Molecule.ReadOnlyGate>
        )}
        <Molecule.ReadOnlyGate action="delete">
          <button type="button" onClick={confirmDelete} className={`${textButton} hover:text-danger`}>
            Delete
          </button>
        </Molecule.ReadOnlyGate>
        {!own && <ReportButton type={type} id={id} ownerId={ownerId} />}
      </>
    );
  }

  function togglePin() {
    pin?.onToggle().catch((error: Error) => {
      message.error(error.message);
    });
  }

  function toggleBookmark() {
    const saving = !bookmark?.bookmarked;
    bookmark
      ?.onToggle()
      .then(() => {
        message.success(saving ? "Saved to your bookmarks." : "Removed from your bookmarks.");
      })
      .catch((error: Error) => {
        message.error(error.message);
      });
  }

  const items: MenuProps["items"] = [
    ...(bookmarkable
      ? [
          {
            key: "bookmark",
            label: bookmark?.bookmarked ? "Remove from bookmarks" : "Save post",
            icon: bookmark?.bookmarked ? <BookmarkX size={14} /> : <Bookmark size={14} />,
            disabled: readOnly,
          },
        ]
      : []),
    ...(pin
      ? [
          {
            key: "pin",
            label: pin.pinned ? "Unpin" : "Pin",
            icon: pin.pinned ? <PinOff size={14} /> : <Pin size={14} />,
            disabled: readOnly,
          },
        ]
      : []),
    ...(own && onEdit
      ? [{ key: "edit", label: "Edit", icon: <Pencil size={14} />, disabled: readOnly }]
      : []),
    ...(canReport
      ? [{ key: "report", label: `Report ${nouns[type]}`, icon: <Flag size={14} />, disabled: readOnly }]
      : []),
    ...(deletable
      ? [{ key: "delete", label: "Delete", icon: <Trash2 size={14} />, danger: true, disabled: readOnly }]
      : []),
    ...(moderating ? [{ type: "divider" as const }] : []),
    ...(moderation?.remove
      ? [
          {
            key: "remove",
            label: `Remove ${moderation.name} from community`,
            icon: <UserMinus size={14} />,
            disabled: readOnly,
          },
        ]
      : []),
    ...(moderation?.ban
      ? [
          {
            key: "ban",
            label: `Ban ${moderation.name}`,
            icon: <Ban size={14} />,
            danger: true,
            disabled: readOnly,
          },
        ]
      : []),
  ];

  const actions: Record<string, (() => void) | undefined> = {
    bookmark: toggleBookmark,
    pin: togglePin,
    edit: onEdit,
    report: () => setReporting(true),
    delete: confirmDelete,
    remove: moderation?.remove,
    ban: moderation?.ban,
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center ${className}`}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items,
          onClick: ({ key }) => actions[key]?.(),
        }}
      >
        <button type="button" aria-label={`More options for this ${nouns[type]}`} className="icon-button cursor-pointer">
          <MoreHorizontal size={16} />
        </button>
      </Dropdown>
      {canReport && (
        <ReportModal type={type} id={id} open={reporting} onClose={() => setReporting(false)} />
      )}
    </span>
  );
}
