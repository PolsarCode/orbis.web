"use client";

import { App, Input, Modal } from "antd";
import { useState } from "react";
import * as Atom from "@atom";
import { banMember, removeMember } from "@/lib/api";
import { requireToken } from "@/stores/auth-store";
import { COMMUNITY_MEMBERS_CHANGED_EVENT } from "@/stores/community-store";

export type ModerationTarget = { communityId: number; userId: number; name: string };

function membersChanged(communityId: number) {
  window.dispatchEvent(new CustomEvent(COMMUNITY_MEMBERS_CHANGED_EVENT, { detail: communityId }));
}

function BanModal({
  target,
  open,
  onClose,
  onBanned,
}: {
  target: ModerationTarget;
  open: boolean;
  onClose: () => void;
  onBanned: () => void;
}) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ban() {
    setPending(true);
    setError(null);
    try {
      await banMember(requireToken(), target.communityId, target.userId, reason);
      onBanned();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      title={`Ban ${target.name}?`}
      okText="Ban"
      okButtonProps={{ danger: true, loading: pending }}
      cancelText="Cancel"
      onOk={ban}
      onCancel={onClose}
      destroyOnHidden
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          They’re removed and can’t join again, even with an invite. Everything they posted here
          is deleted, including posts, comments and forum threads. This can’t be undone.
        </p>
        <Input.TextArea
          value={reason}
          maxLength={300}
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder="Reason (optional, only admins see it)"
          aria-label="Reason for the ban"
          onChange={(event) => setReason(event.target.value)}
        />
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      </div>
    </Modal>
  );
}

export function useMemberModeration({
  onRemoved,
  onBanned,
}: {
  onRemoved?: (target: ModerationTarget) => void;
  onBanned?: (target: ModerationTarget) => void;
}) {
  const { modal, message } = App.useApp();
  const [banning, setBanning] = useState<{ target: ModerationTarget; key: number } | null>(null);
  const [open, setOpen] = useState(false);

  function remove(target: ModerationTarget) {
    modal.confirm({
      title: `Remove ${target.name}?`,
      content: "They lose access to the community, and what they posted stays. They can come back later.",
      okText: "Remove",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () =>
        removeMember(requireToken(), target.communityId, target.userId)
          .then(() => {
            message.success(`Removed ${target.name}`);
            membersChanged(target.communityId);
            onRemoved?.(target);
          })
          .catch((error: Error) => {
            message.error(error.message);
          }),
    });
  }

  function ban(target: ModerationTarget) {
    setBanning((current) => ({ target, key: (current?.key ?? 0) + 1 }));
    setOpen(true);
  }

  const dialog = banning && (
    <BanModal
      key={banning.key}
      target={banning.target}
      open={open}
      onClose={() => setOpen(false)}
      onBanned={() => {
        message.success(`Banned ${banning.target.name}`);
        membersChanged(banning.target.communityId);
        onBanned?.(banning.target);
      }}
    />
  );

  return { remove, ban, dialog };
}
