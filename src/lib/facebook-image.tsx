import { ImageResponse } from "next/og";
import type { ReactElement, ReactNode } from "react";
import type { MediaType } from "./api";
import type { ImageSize } from "./image-data";
import { ogFonts } from "./og-fonts";
import { palette } from "./palette";
import { SHARE_IMAGE } from "./share-backdrop";
import { dateRange } from "./time";

const { background, divider, foreground, muted, accent, accentForeground } = palette.dark;
const DAY = 86_400_000;
const fade = (opacity: number) => `rgba(28,29,27,${opacity})`;

export const WEEK = /^\d{4}-W\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const medals = ["#fcd34d", "#e4e4e7", "#fdba74"];
export const crownPaths = [
  "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
  "M5 21h14",
];
export const typeNames: Record<MediaType, string> = { anime: "Anime", manga: "Manga", game: "Games" };

export function mediaTypeOf(value: string): MediaType | null {
  return (Object.keys(typeNames) as MediaType[]).find((type) => type === value) ?? null;
}

export const isDate = (value: string) => DATE.test(value) && !Number.isNaN(Date.parse(value));

export const number = (value: number) => value.toLocaleString("en-US");

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${number(count)} ${count === 1 ? one : many}`;

export const daysRange = (startsAt: string, endsAt: string) =>
  dateRange(new Date(startsAt), new Date(Date.parse(endsAt) - DAY));

export const periodMaxAge = (endsAt: string, current = 3600) =>
  Date.parse(endsAt) <= Date.now() ? 604800 : current;

export async function imageResponse(
  element: ReactElement,
  maxAge: number,
  size: ImageSize = SHARE_IMAGE,
) {
  return new ImageResponse(element, {
    ...size,
    fonts: await ogFonts(),
    headers: { "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}` },
  });
}

const platformNames: [string, string][] = [
  ["PC (Microsoft Windows)", "PC"],
  ["PlayStation 5", "PS5"],
  ["Xbox Series X|S", "Xbox"],
  ["Nintendo Switch 2", "Switch 2"],
  ["Nintendo Switch", "Switch"],
  ["iOS", "iOS"],
  ["Android", "Android"],
];

const names = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item !== "")
    : [];

export function shortPlatforms(details: Record<string, unknown>) {
  const platforms = names(details.platforms);
  return platformNames.filter(([name]) => platforms.includes(name)).map(([, short]) => short);
}

export const formatName = (details: Record<string, unknown>) =>
  typeof details.format === "string" && details.format ? details.format.replaceAll("_", " ") : null;

const counted = (value: unknown, unit: string) =>
  typeof value === "number" && value > 0 ? plural(value, unit) : null;

export function metaLine(type: MediaType, details: Record<string, unknown>, detailed = false) {
  if (type === "game") {
    return [shortPlatforms(details).join(" · "), detailed && names(details.developers)[0]]
      .filter(Boolean)
      .join(" · ");
  }
  const anime = type === "anime";
  return [
    formatName(details),
    detailed && counted(anime ? details.episodes : details.chapters, anime ? "episode" : "chapter"),
    names(anime ? details.studios : details.authors)[0],
  ]
    .filter(Boolean)
    .join(" · ");
}

export function Frame({ backdrop, children }: { backdrop: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        padding: "48px 56px",
        backgroundColor: background,
        backgroundImage: `url(${backdrop})`,
        backgroundSize: "100% 100%",
        color: foreground,
        fontFamily: "Inter",
      }}
    >
      {children}
    </div>
  );
}

export function Wordmark({ size = 70, shadow = false }: { size?: number; shadow?: boolean }) {
  return (
    <div
      style={{
        fontFamily: "Barlow Condensed",
        fontSize: size,
        fontWeight: 800,
        color: accent,
        lineHeight: 1,
        ...(shadow && { textShadow: "0 2px 12px rgba(0,0,0,0.6)" }),
      }}
    >
      orbis.
    </div>
  );
}

export function Header({ headline, subline }: { headline: string; subline: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Wordmark />
      <div
        style={{
          marginTop: 8,
          fontFamily: "Barlow Condensed",
          fontSize: 54,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {headline}
      </div>
      <div style={{ marginTop: 8, fontSize: 26, color: muted }}>{subline}</div>
    </div>
  );
}

export function Chip({ children }: { children: string }) {
  return (
    <div
      style={{
        display: "flex",
        marginTop: 14,
        padding: "6px 16px",
        borderRadius: 999,
        background: accent,
        color: accentForeground,
        fontSize: 20,
        fontWeight: 600,
        letterSpacing: 2,
      }}
    >
      {children}
    </div>
  );
}

export function ChipHeader({ chip, shadow = false }: { chip: string; shadow?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Wordmark shadow={shadow} />
      <Chip>{chip}</Chip>
    </div>
  );
}

export function Footer({ caption, site }: { caption: string; site: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginTop: "auto",
        paddingTop: 16,
        fontSize: 22,
        color: muted,
      }}
    >
      <span>{caption}</span>
      <span style={{ color: foreground, fontWeight: 600 }}>{site}</span>
    </div>
  );
}

export function Cover({ src, size, radius }: { src: string | null; size: ImageSize; radius: number }) {
  return (
    <div
      style={{
        ...size,
        flexShrink: 0,
        borderRadius: radius,
        backgroundColor: divider,
        backgroundImage: src ? `url(${src})` : "none",
        backgroundSize: "100% 100%",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
      }}
    />
  );
}

export const BANNER = { width: SHARE_IMAGE.width, height: 700 };

export function Banner({ src }: { src: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        ...BANNER,
        display: "flex",
        backgroundImage: `url(${src})`,
        backgroundSize: "100% 100%",
      }}
    >
      <div
        style={{
          ...BANNER,
          backgroundImage: `linear-gradient(to bottom, ${fade(0.55)}, ${fade(0.2)} 35%, ${background})`,
        }}
      />
    </div>
  );
}

export function ActionPill({ children }: { children: string }) {
  return (
    <div
      style={{
        display: "flex",
        marginTop: 8,
        padding: "14px 32px",
        borderRadius: 999,
        background: accent,
        color: accentForeground,
        fontSize: 28,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

export function Icon({
  paths,
  color,
  size,
  weight = 2,
}: {
  paths: string[];
  color: string;
  size: number;
  weight?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
