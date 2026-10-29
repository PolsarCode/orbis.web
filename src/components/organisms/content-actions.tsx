"use client";

import { App, Dropdown, type MenuProps } from "antd";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import * as Molecule from "@molecule";
import { useReadOnly } from "@/lib/read-only";
import { useAuthStore } from "@/stores/auth-store";
import { ReportButton } from "./report-content";

type EditableType = "post" | "comment";

const deleteNotes: Record<EditableType, string> = {
  post: "Its comments are deleted with it. This can’t be undone.",
  comment: "This can’t be undone. If it has replies, they stay.",
};

export function ContentActions({
  type,
  id,
  ownerId,
  canDelete = false,
  onEdit,
  onDelete,
  variant = "icon",
  className = "",
}: {
  type: EditableType;
  id: number;
  ownerId: number;
  canDelete?: boolean;
  onEdit?: () => void;
  onDelete: () => Promise<void>;
  variant?: "icon" | "text";
  className?: string;
}) {
  const myId = useAuthStore((state) => state.profile?.userId);
  const readOnly = useReadOnly();
  const { modal, message } = App.useApp();
  const own = myId !== undefined && myId === ownerId;
  const deletable = own || canDelete;

  if (!own && !deletable) {
    return (
      <ReportButton type={type} id={id} ownerId={ownerId} variant={variant} className={className} />
    );
  }

  function confirmDelete() {
    modal.confirm({
      title: `Delete this ${type}?`,
      content: deleteNotes[type],
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () =>
        onDelete().catch((error: Error) => {
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
        {!own && <ReportButton type={type} id={id} ownerId={ownerId} variant="text" />}
      </>
    );
  }

  const items: MenuProps["items"] = [
    ...(own && onEdit
      ? [{ key: "edit", label: "Edit", icon: <Pencil size={14} />, disabled: readOnly }]
      : []),
    { key: "delete", label: "Delete", icon: <Trash2 size={14} />, danger: true, disabled: readOnly },
  ];

  return (
    <span
      className={`inline-flex shrink-0 items-center ${className}`}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {!own && <ReportButton type={type} id={id} ownerId={ownerId} />}
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items,
          onClick: ({ key }) => (key === "edit" ? onEdit?.() : confirmDelete()),
        }}
      >
        <button type="button" aria-label={`More options for this ${type}`} className="icon-button cursor-pointer">
          <MoreHorizontal size={16} />
        </button>
      </Dropdown>
    </span>
  );
}
