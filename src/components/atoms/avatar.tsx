import Image from "next/image";
import type { Device, PresenceStatus } from "@/lib/api";
import { avatarTone } from "@/lib/avatar-tone";
import { presenceText, showsDevice } from "@/lib/presence";
import { PresenceDot } from "./presence-dot";

const tones = ["bg-accent-soft", "bg-rail-item"];

const sizes = {
  "2xs": "h-3.5 w-3.5 text-[8px]",
  xs: "h-5 w-5 text-[11px]",
  sm: "h-8 w-8 text-[17.6px]",
  md: "h-9 w-9 text-[19.8px]",
  rail: "h-8 w-8 text-[17.6px] sm:h-10 sm:w-10 sm:text-[22px]",
  lg: "h-[88px] w-[88px] text-[44px]",
};

const badges: Partial<Record<keyof typeof sizes, { box: string; icon: string }>> = {
  sm: { box: "h-4 w-4", icon: "size-[9px]" },
  md: { box: "h-[18px] w-[18px]", icon: "size-2.5" },
  rail: { box: "h-4 w-4 sm:h-5 sm:w-5", icon: "size-[9px] sm:size-[11px]" },
  lg: { box: "h-7 w-7", icon: "size-4" },
};

export function Avatar({
  label,
  src,
  seed = label,
  size = "md",
  presence,
  device,
}: {
  label: string;
  src?: string | null;
  seed?: string | number;
  size?: keyof typeof sizes;
  presence?: PresenceStatus;
  device?: Device | null;
}) {
  const badge = showsDevice(presence) && device ? badges[size] : undefined;

  return (
    <span
      aria-hidden
      className={`relative flex shrink-0 items-center justify-center rounded-full border border-divider font-display leading-none font-bold text-foreground ${sizes[size]} ${tones[avatarTone(seed)]}`}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          className="rounded-full object-cover"
        />
      ) : (
        Array.from(label)[0]?.toUpperCase()
      )}
      {presence && (
        <PresenceDot
          status={presence}
          device={device}
          size="h-3 w-3"
          badge={badge}
          title={badge && presenceText(presence, device)}
          className="absolute -right-px -bottom-px border-2 border-surface"
        />
      )}
    </span>
  );
}
