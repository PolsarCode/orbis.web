"use client";

import { App, Input, Modal, Radio, Tooltip } from "antd";
import { EyeOff, Flag } from "lucide-react";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { reportContent, type ContentReportReason, type ContentReportTarget } from "@/lib/api";
import { useReadOnly } from "@/lib/read-only";
import { useAuthStore } from "@/stores/auth-store";

export const reportReasons: { value: ContentReportReason; label: string; hint: string }[] = [
  { value: "spam", label: "Spam", hint: "Ads, scams, or the same thing posted over and over." },
  { value: "harassment", label: "Harassment", hint: "Bullying, threats, or targeting someone." },
  { value: "inappropriate", label: "Inappropriate", hint: "Explicit, hateful, or otherwise not okay here." },
  { value: "other", label: "Something else", hint: "Anything else the admins should look at." },
];

const nouns: Record<ContentReportTarget, string> = {
  post: "post",
  comment: "comment",
  user: "profile",
  community: "community",
};

function ReportModal({
  type,
  id,
  open,
  onClose,
}: {
  type: ContentReportTarget;
  id: number;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [reason, setReason] = useState<ContentReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setReason(null);
    setDetails("");
    setError(null);
    onClose();
  }

  async function submit() {
    const { token } = useAuthStore.getState();
    if (!token || !reason) return;

    setPending(true);
    setError(null);
    try {
      await reportContent(token, { type, id, reason, details: details.trim() || undefined });
      close();
      message.success("Thanks for letting us know. An admin will take a look.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      title={null}
      footer={null}
      width={460}
      destroyOnHidden
      onCancel={close}
      styles={{ container: { padding: 24 } }}
    >
      <div className="flex flex-col gap-6">
        <Molecule.ModalHeader
          eyebrow="Report"
          title={`Report this ${nouns[type]}.`}
          description="Only admins see reports. The person you report isn’t told who reported them."
        />
        <Radio.Group
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="flex flex-col gap-3"
        >
          {reportReasons.map((option) => (
            <Radio key={option.value} value={option.value}>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-muted">{option.hint}</span>
              </span>
            </Radio>
          ))}
        </Radio.Group>
        <Input.TextArea
          aria-label="Details"
          placeholder="Add details (optional)"
          maxLength={1000}
          autoSize={{ minRows: 2, maxRows: 6 }}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex justify-end gap-2 border-t border-divider pt-6">
          <Atom.Button variant="secondary" onClick={close}>
            Cancel
          </Atom.Button>
          <Atom.Button danger loading={pending} disabled={!reason} onClick={submit}>
            Report
          </Atom.Button>
        </div>
      </div>
    </Modal>
  );
}

export function HiddenNotice() {
  return (
    <p className="flex items-center gap-2 rounded-md border border-divider bg-rail px-3 py-2 text-xs text-muted">
      <EyeOff size={14} aria-hidden className="shrink-0" />
      Hidden from others while admins review reports. Only you can see it.
    </p>
  );
}

export function ReportButton({
  type,
  id,
  ownerId,
  variant = "icon",
  className = "",
}: {
  type: ContentReportTarget;
  id: number;
  ownerId: number;
  variant?: "icon" | "text";
  className?: string;
}) {
  const myId = useAuthStore((state) => state.profile?.userId);
  const readOnly = useReadOnly();
  const [open, setOpen] = useState(false);

  if (myId === undefined || myId === ownerId) return null;

  const label = `Report ${nouns[type]}`;
  const tooltip = readOnly ? "Confirm your email first to report." : label;
  const report = () => {
    if (!readOnly) setOpen(true);
  };

  return (
    <span
      className={`inline-flex shrink-0 ${className}`}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {variant === "text" ? (
        <Tooltip
          title={readOnly ? tooltip : undefined}
          classNames={readOnly ? { root: "touch-visible" } : undefined}
        >
          <button
            type="button"
            aria-disabled={readOnly || undefined}
            onClick={report}
            className={`focus-ring rounded-sm px-1 text-xs font-semibold text-muted transition-colors ${
              readOnly ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:text-danger"
            }`}
          >
            Report
          </button>
        </Tooltip>
      ) : (
        <Tooltip
          title={tooltip}
          classNames={readOnly ? { root: "touch-visible" } : undefined}
        >
          <button
            type="button"
            aria-label={label}
            aria-disabled={readOnly || undefined}
            onClick={report}
            className={`icon-button ${
              readOnly ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:text-danger"
            }`}
          >
            <Flag size={16} />
          </button>
        </Tooltip>
      )}
      <ReportModal type={type} id={id} open={open} onClose={() => setOpen(false)} />
    </span>
  );
}
