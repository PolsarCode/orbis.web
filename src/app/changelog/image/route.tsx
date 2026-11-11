import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { changeCount, formatChangelogDate, type ChangelogType } from "@/lib/changelog";
import { getChangelog } from "@/lib/changelog-files";
import { clampLines, ogFonts } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";
import { SHARE_IMAGE, shareBackdrop } from "@/lib/share-backdrop";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SHOWN = 4;
const { background, surface, divider, foreground, muted, accent, accentForeground } = palette.dark;

const kinds: Record<ChangelogType, { label: string; color: string; icon: ReactElement[] }> = {
  new: {
    label: "New",
    color: "#b195f2",
    icon: [
      <path
        key="star"
        d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"
      />,
      <path key="up" d="M20 2v4" />,
      <path key="across" d="M22 4h-4" />,
      <circle key="dot" cx="4" cy="20" r="2" />,
    ],
  },
  improved: {
    label: "Improved",
    color: "#6fa0f0",
    icon: [<path key="head" d="M16 7h6v6" />, <path key="line" d="m22 7-8.5 8.5-5-5L2 17" />],
  },
  fixed: {
    label: "Fixed",
    color: "#7cc494",
    icon: [
      "M12 20v-9",
      "M14 7a4 4 0 0 1 4 4v3a6 6 0 0 1-12 0v-3a4 4 0 0 1 4-4z",
      "M14.12 3.88 16 2",
      "M21 21a4 4 0 0 0-3.81-4",
      "M21 5a4 4 0 0 1-3.55 3.97",
      "M22 13h-4",
      "M3 21a4 4 0 0 1 3.81-4",
      "M3 5a4 4 0 0 0 3.55 3.97",
      "M6 13H2",
      "m8 2 1.88 1.88",
      "M9 7.13V6a3 3 0 1 1 6 0v1.13",
    ].map((d) => <path key={d} d={d} />),
  },
};

type Change = { type: ChangelogType; title: string; description: string };

function ChangeCard({ change, lines }: { change: Change; lines: number }) {
  const kind = kinds[change.type];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 22,
        padding: "22px 26px",
        borderRadius: 22,
        border: `2px solid ${divider}`,
        backgroundColor: surface,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: 58,
          height: 58,
          borderRadius: 16,
          backgroundColor: `${kind.color}26`,
        }}
      >
        <svg
          width={30}
          height={30}
          viewBox="0 0 24 24"
          fill="none"
          stroke={kind.color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {kind.icon}
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 6 }}>
        <div
          style={{
            display: "flex",
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: 1.5,
            color: kind.color,
          }}
        >
          {kind.label.toUpperCase()}
        </div>
        <div
          style={{
            ...clampLines(2, 34),
            fontFamily: "Barlow Condensed",
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {change.title}
        </div>
        <div style={{ ...clampLines(lines, 22), fontSize: 22, lineHeight: 1.4, color: muted }}>
          {change.description}
        </div>
      </div>
    </div>
  );
}

function UpdateImage({
  version,
  dates,
  changes,
  site,
  backdrop,
}: {
  version: string | null;
  dates: string;
  changes: Change[];
  site: string;
  backdrop: string;
}) {
  const shown = changes.length > SHOWN + 1 ? changes.slice(0, SHOWN) : changes;
  const hidden = changes.length - shown.length;
  const lines = shown.length <= 3 ? 3 : 2;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "48px 56px",
        backgroundColor: background,
        backgroundImage: `url(${backdrop})`,
        backgroundSize: "100% 100%",
        color: foreground,
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            fontFamily: "Barlow Condensed",
            fontSize: 70,
            fontWeight: 800,
            color: accent,
            lineHeight: 1,
          }}
        >
          orbis.
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: "Barlow Condensed",
            fontSize: 60,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          What’s new
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
          {version && (
            <div
              style={{
                display: "flex",
                padding: "4px 18px",
                borderRadius: 999,
                backgroundColor: accent,
                color: accentForeground,
                fontFamily: "Barlow Condensed",
                fontSize: 30,
                fontWeight: 800,
              }}
            >
              {version}
            </div>
          )}
          <div style={{ display: "flex", fontSize: 26, color: muted }}>{dates}</div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          marginTop: 36,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {shown.map((change) => (
          <ChangeCard key={`${change.type}:${change.title}`} change={change} lines={lines} />
        ))}
        {hidden > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "18px 26px",
              borderRadius: 22,
              border: `2px dashed ${divider}`,
              fontFamily: "Barlow Condensed",
              fontSize: 30,
              fontWeight: 700,
              color: muted,
            }}
          >
            {`+ ${hidden} more ${hidden === 1 ? "change" : "changes"}`}
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 16,
          fontSize: 22,
          color: muted,
        }}
      >
        <span>{`${changeCount(changes.length)} in this update`}</span>
        <span style={{ color: foreground, fontWeight: 600 }}>{`${site}/changelog`}</span>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const from = url.searchParams.get("from");
  if (!DAY.test(date) || (from && !DAY.test(from))) {
    return new Response("Pick a day like 2026-11-10.", { status: 400 });
  }

  const days = getChangelog().filter((day) =>
    from ? day.date <= date && day.date >= from : day.date === date,
  );
  if (days.length === 0) return new Response("No update for that day.", { status: 404 });

  const newest = days[0];
  const oldest = days[days.length - 1];
  const dates =
    days.length === 1
      ? formatChangelogDate(newest.date)
      : `${formatChangelogDate(oldest.date, "short")} – ${formatChangelogDate(newest.date, "short")}`;

  return new ImageResponse(
    <UpdateImage
      version={newest.versions?.at(-1) ?? null}
      dates={dates}
      changes={days.flatMap((day) => day.entries)}
      site={url.host}
      backdrop={await shareBackdrop()}
    />,
    {
      ...SHARE_IMAGE,
      fonts: await ogFonts(),
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    },
  );
}
