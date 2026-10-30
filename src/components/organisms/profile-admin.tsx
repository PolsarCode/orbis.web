"use client";

import { App, Input, Modal, Popover, Radio, Switch } from "antd";
import { Ban, ShieldCheck, ShieldOff, Timer, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  resetTwoFactor,
  setAccountSuspension,
  setSiteAdmin,
  type ProfileSuspension,
  type SuspensionDuration,
} from "@/lib/api";
import { inviteCountdown } from "@/lib/invites";
import { useAuthStore } from "@/stores/auth-store";

const REASON_MAX = 500;

const durations: { value: SuspensionDuration; label: string }[] = [
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "permanent", label: "Ban permanently" },
];

function suspensionLabel(suspension: ProfileSuspension) {
  if (!suspension.until) return "Banned";
  const until = new Date(suspension.until).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `Suspended until ${until}`;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  return now;
}

export function SuspensionCountdown({ suspension }: { suspension: ProfileSuspension }) {
  const now = useNow(Boolean(suspension.until));
  if (suspension.until && new Date(suspension.until).getTime() <= now) return null;

  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface/85 p-0.5 backdrop-blur">
      <Popover
        trigger="click"
        placement="bottomRight"
        content={
          <div className="flex max-w-64 flex-col gap-1 text-xs">
            <p className="font-semibold">
              {suspension.until ? suspensionLabel(suspension) : "Banned permanently"}
            </p>
            {suspension.reason && <p className="text-muted">Reason: {suspension.reason}</p>}
          </div>
        }
      >
        <Atom.Button
          size="small"
          variant="secondary"
          danger
          icon={suspension.until ? <Timer size={14} /> : <Ban size={14} />}
          className="shrink-0 tabular-nums"
        >
          {suspension.until
            ? `Suspended · ${inviteCountdown(suspension.until, now)} left`
            : "Banned"}
        </Atom.Button>
      </Popover>
    </div>
  );
}

function token() {
  const { token } = useAuthStore.getState();
  if (!token) throw new Error("Please log in again.");
  return token;
}

function Suspension({
  username,
  name,
  suspension,
  onChange,
}: {
  username: string;
  name: string;
  suspension: ProfileSuspension | null;
  onChange: (suspension: ProfileSuspension | null) => void;
}) {
  const { message } = App.useApp();
  const [duration, setDuration] = useState<SuspensionDuration>("7d");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function update(next: { duration: SuspensionDuration; reason?: string } | null) {
    setPending(true);
    try {
      const result = await setAccountSuspension(token(), username, next);
      onChange(result);
      setReason("");
      message.success(
        result
          ? `${name} is ${result.until ? "suspended" : "banned"} and has been signed out.`
          : `${name} can log in again.`,
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (suspension) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold">{suspensionLabel(suspension)}</p>
        {suspension.reason && (
          <p className="text-xs text-muted">Reason: {suspension.reason}</p>
        )}
        <Molecule.ReadOnlyGate action="lift suspensions">
          <Atom.Button
            size="small"
            variant="secondary"
            loading={pending}
            icon={<UserCheck size={14} />}
            onClick={() => update(null)}
            className="w-fit"
          >
            {suspension.until ? "Lift suspension" : "Lift ban"}
          </Atom.Button>
        </Molecule.ReadOnlyGate>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted">
        They’re signed out everywhere and can’t log in, and their posts, comments, and library
        updates are hidden until the suspension ends.
      </p>
      <Radio.Group
        value={duration}
        onChange={(event) => setDuration(event.target.value)}
        className="flex flex-col gap-2"
      >
        {durations.map((option) => (
          <Radio key={option.value} value={option.value}>
            {option.label}
          </Radio>
        ))}
      </Radio.Group>
      <Input.TextArea
        aria-label="Reason"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={REASON_MAX}
        showCount
        autoSize={{ minRows: 2, maxRows: 5 }}
        placeholder="Reason (optional). They’ll see it when they try to log in."
      />
      <Molecule.ReadOnlyGate action="suspend accounts">
        <Atom.Button
          size="small"
          danger
          loading={pending}
          icon={<Ban size={14} />}
          onClick={() => update({ duration, reason: reason.trim() || undefined })}
          className="w-fit"
        >
          {duration === "permanent" ? "Ban" : "Suspend"}
        </Atom.Button>
      </Molecule.ReadOnlyGate>
    </div>
  );
}

function TwoFactor({
  username,
  name,
  enabled,
  onReset,
}: {
  username: string;
  name: string;
  enabled: boolean;
  onReset: () => void;
}) {
  const { modal, message } = App.useApp();

  function confirmRemove() {
    modal.confirm({
      title: `Remove ${name}’s two-factor sign-in?`,
      content:
        "They’ll log in with just their password until they set it up again in Settings. Use this when they’ve lost their phone and their recovery codes.",
      okText: "Remove",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await resetTwoFactor(token(), username);
          onReset();
          message.success(`${name}’s two-factor sign-in is removed.`);
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Something went wrong.");
        }
      },
    });
  }

  if (!enabled) {
    return <p className="text-xs text-muted">Off. They log in with just their password.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        On. Remove it if they’ve lost their phone and their recovery codes.
      </p>
      <Molecule.ReadOnlyGate action="remove two-factor sign-in">
        <Atom.Button
          size="small"
          variant="secondary"
          danger
          icon={<ShieldOff size={14} />}
          onClick={confirmRemove}
          className="w-fit"
        >
          Remove two-factor sign-in
        </Atom.Button>
      </Molecule.ReadOnlyGate>
    </div>
  );
}

export function ProfileAdmin({
  username,
  name,
  isVerified,
  isAdmin,
  suspension,
  twoFactorEnabled,
  canVerify,
  canChangeAdmin,
  canSuspend,
  canResetTwoFactor,
  onVerify,
  onAdminChange,
  onSuspensionChange,
  onTwoFactorReset,
}: {
  username: string;
  name: string;
  isVerified: boolean;
  isAdmin: boolean;
  suspension: ProfileSuspension | null;
  twoFactorEnabled: boolean | null;
  canVerify: boolean;
  canChangeAdmin: boolean;
  canSuspend: boolean;
  canResetTwoFactor: boolean;
  onVerify: (verified: boolean) => Promise<void>;
  onAdminChange: (isAdmin: boolean) => void;
  onSuspensionChange: (suspension: ProfileSuspension | null) => void;
  onTwoFactorReset: () => void;
}) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<"verified" | "admin" | null>(null);

  async function toggle(setting: "verified" | "admin", value: boolean) {
    setPending(setting);
    try {
      if (setting === "verified") await onVerify(value);
      else onAdminChange(await setSiteAdmin(token(), username, value));
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <Atom.Button
        size="small"
        variant="secondary"
        icon={<ShieldCheck size={14} />}
        onClick={() => setOpen(true)}
        className="shrink-0"
      >
        Admin
      </Atom.Button>
      <Modal
        open={open}
        title={null}
        footer={null}
        width={440}
        destroyOnHidden
        onCancel={() => setOpen(false)}
        styles={{ container: { padding: 24 } }}
      >
        <div className="flex flex-col gap-6">
          <Molecule.ModalHeader eyebrow="Admin" title={name} />
          {(canVerify || canChangeAdmin) && (
            <div className="flex flex-col gap-4">
              {canVerify && (
                <Molecule.SettingsRow
                  label="Verified"
                  description="Shows a verified badge next to their name."
                >
                  <Switch
                    checked={isVerified}
                    loading={pending === "verified"}
                    onChange={(value) => toggle("verified", value)}
                  />
                </Molecule.SettingsRow>
              )}
              {canChangeAdmin && (
                <Molecule.SettingsRow
                  label="Site admin"
                  description="Site admins can moderate everything on Orbis."
                >
                  <Switch
                    checked={isAdmin}
                    loading={pending === "admin"}
                    onChange={(value) => toggle("admin", value)}
                  />
                </Molecule.SettingsRow>
              )}
            </div>
          )}
          {canSuspend && (
            <section
              className={`flex flex-col gap-3 ${canVerify || canChangeAdmin ? "border-t border-divider pt-6" : ""}`}
            >
              <h3 className="text-sm font-semibold">Suspension</h3>
              <Suspension
                username={username}
                name={name}
                suspension={suspension}
                onChange={onSuspensionChange}
              />
            </section>
          )}
          {canResetTwoFactor && twoFactorEnabled !== null && (
            <section
              className={`flex flex-col gap-3 ${canVerify || canChangeAdmin || canSuspend ? "border-t border-divider pt-6" : ""}`}
            >
              <h3 className="text-sm font-semibold">Two-factor sign-in</h3>
              <TwoFactor
                username={username}
                name={name}
                enabled={twoFactorEnabled}
                onReset={onTwoFactorReset}
              />
            </section>
          )}
        </div>
      </Modal>
    </>
  );
}
