import type { ComponentProps } from "react";
import type { Device, PresenceStatus } from "@/lib/api";
import { deviceIcon, presenceDot, presenceIcon, showsDevice } from "@/lib/presence";

export function PresenceDot({
  status,
  device,
  size,
  badge,
  className = "",
  ...props
}: Omit<ComponentProps<"span">, "children"> & {
  status: PresenceStatus;
  device?: Device | null;
  size: string;
  badge?: { box: string; icon: string };
}) {
  const Icon = device ? deviceIcon[device] : null;

  if (!badge || !Icon || !showsDevice(status)) {
    return <span {...props} className={`rounded-full ${presenceDot[status]} ${size} ${className}`} />;
  }

  return (
    <span
      {...props}
      className={`flex items-center justify-center rounded-full ${presenceDot[status]} ${presenceIcon[status]} ${badge.box} ${className}`}
    >
      <Icon aria-hidden strokeWidth={3} className={badge.icon} />
    </span>
  );
}
