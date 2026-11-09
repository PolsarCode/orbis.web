import { Globe, Monitor, Smartphone, type LucideIcon } from "lucide-react";
import type { Device, PresenceStatus, UserStatus } from "./api";

export const presenceDot: Record<PresenceStatus, string> = {
  online: "bg-online",
  idle: "bg-warning",
  busy: "bg-danger",
  streaming: "bg-[#9146FF]",
  offline: "bg-offline",
};

export const presenceIcon: Record<UserStatus, string> = {
  online: "text-surface",
  idle: "text-warning-foreground",
  busy: "text-surface",
};

export const presenceLabel: Record<PresenceStatus, string> = {
  online: "Online",
  idle: "Idle",
  busy: "Busy",
  streaming: "Live on Twitch",
  offline: "Offline",
};

export const deviceIcon: Record<Device, LucideIcon> = {
  web: Globe,
  desktop: Monitor,
  mobile: Smartphone,
};

export function showsDevice(status?: PresenceStatus): status is UserStatus {
  return status === "online" || status === "idle" || status === "busy";
}

export function presenceText(status: PresenceStatus, device?: Device | null) {
  return showsDevice(status) && device
    ? `${presenceLabel[status]} on ${device}`
    : presenceLabel[status];
}
