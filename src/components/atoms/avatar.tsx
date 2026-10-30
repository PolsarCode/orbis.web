import Image from "next/image";
import type { PresenceStatus } from "@/lib/api";
import { avatarTone } from "@/lib/avatar-tone";
import { presenceDot } from "@/lib/presence";

const tones = ["bg-accent-soft", "bg-rail-item"];

const sizes = {
  "2xs": "h-3.5 w-3.5 text-[8px]",
  xs: "h-5 w-5 text-[11px]",
  sm: "h-8 w-8 text-[17.6px]",
  md: "h-9 w-9 text-[19.8px]",
  rail: "h-8 w-8 text-[17.6px] sm:h-10 sm:w-10 sm:text-[22px]",
  lg: "h-[88px] w-[88px] text-[44px]",
};

export function Avatar({
  label,
  src,
  seed = label,
  size = "md",
  presence,
}: {
  label: string;
  src?: string | null;
  seed?: string | number;
  size?: keyof typeof sizes;
  presence?: PresenceStatus;
}) {
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
        <span
          className={`absolute -right-px -bottom-px h-3 w-3 rounded-full border-2 border-surface ${
            presenceDot[presence]
          }`}
        />
      )}
    </span>
  );
}
