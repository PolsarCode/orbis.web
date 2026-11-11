import { getChart, type Chart, type ChartEntry, type MediaType } from "@/lib/api";
import {
  Cover,
  crownPaths,
  Icon,
  imageResponse,
  medals,
  periodMaxAge,
  typeNames,
  WEEK,
  Wordmark,
} from "@/lib/facebook-image";
import { imageData, retina } from "@/lib/image-data";
import { clampLines } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";
import { SHARE_IMAGE, shareBackdrop } from "@/lib/share-backdrop";
import { weekRange } from "@/lib/time";

const PAGE_COVER = { width: 1640, height: 856 };
const SAFE_AREA = { width: 1200, height: 620 };
const BACKDROP = {
  width: PAGE_COVER.width,
  height: Math.round((PAGE_COVER.width / SHARE_IMAGE.width) * SHARE_IMAGE.height),
};
const COVERS = [
  { width: 140, height: 200 },
  { width: 60, height: 86 },
  { width: 60, height: 86 },
];
const TOP = COVERS.length;
const types: MediaType[] = ["anime", "manga", "game"];
const { background, surface, divider, foreground, muted, accent } = palette.dark;

type Column = { type: MediaType; entries: ChartEntry[]; covers: (string | null)[] };

function Leader({ entry, cover }: { entry: ChartEntry; cover: string | null }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
      <Cover src={cover} size={COVERS[0]} radius={12} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: medals[0],
            fontFamily: "Barlow Condensed",
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          <Icon paths={crownPaths} color={medals[0]} size={40} weight={3} />
          #1
        </div>
        <div
          style={{
            ...clampLines(3, 30),
            wordBreak: "break-word",
            fontFamily: "Barlow Condensed",
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.05,
          }}
        >
          {entry.media.title}
        </div>
      </div>
    </div>
  );
}

function RunnerUp({ entry, cover, index }: { entry: ChartEntry; cover: string | null; index: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Cover src={cover} size={COVERS[index]} radius={8} />
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          width: 44,
          color: medals[index] ?? foreground,
          fontFamily: "Barlow Condensed",
          fontSize: 34,
          fontWeight: 800,
          lineHeight: 1,
        }}
      >
        {`#${entry.rank}`}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <div style={{ ...clampLines(2, 22), wordBreak: "break-word", fontSize: 22, fontWeight: 600, lineHeight: 1.2 }}>
          {entry.media.title}
        </div>
      </div>
    </div>
  );
}

function ChartColumn({ column }: { column: Column }) {
  const [leader, ...rest] = column.entries;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
        gap: 14,
        padding: 20,
        borderRadius: 24,
        border: `2px solid ${divider}`,
        background: surface,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: 2,
          color: accent,
        }}
      >
        {typeNames[column.type].toUpperCase()}
      </div>
      <Leader entry={leader} cover={column.covers[0]} />
      {rest.map((entry, index) => (
        <RunnerUp
          key={entry.media.id}
          entry={entry}
          cover={column.covers[index + 1]}
          index={index + 1}
        />
      ))}
    </div>
  );
}

function PageCover({
  chart,
  columns,
  backdrop,
}: {
  chart: Chart;
  columns: Column[];
  backdrop: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        backgroundColor: background,
        color: foreground,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          ...BACKDROP,
          backgroundImage: `url(${backdrop})`,
          backgroundSize: "100% 100%",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", ...SAFE_AREA }}>
        <Wordmark size={64} />
        <div style={{ display: "flex", marginTop: 8, fontSize: 26, color: muted }}>
          {`Trending this week · ${weekRange(chart.startsAt, chart.endsAt)}`}
        </div>
        <div style={{ display: "flex", flex: 1, gap: 24, width: "100%", marginTop: 24 }}>
          {columns.map((column) => (
            <ChartColumn key={column.type} column={column} />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const week = new URL(request.url).searchParams.get("week") ?? undefined;
  if (week !== undefined && !WEEK.test(week)) return new Response("Not found.", { status: 404 });

  let charts: (Chart | null)[];
  try {
    charts = await Promise.all(types.map((type) => getChart(null, type, week)));
  } catch {
    return new Response("The charts aren’t available right now.", { status: 502 });
  }
  const shown = types.flatMap((type, index) => {
    const entries = charts[index]?.entries.slice(0, TOP) ?? [];
    return entries.length ? [{ type, entries }] : [];
  });
  const chart = charts.find((item) => item?.entries.length);
  if (!chart || !shown.length) return new Response("No charts for this week.", { status: 404 });

  const [columns, backdrop] = await Promise.all([
    Promise.all(
      shown.map(async ({ type, entries }) => ({
        type,
        entries,
        covers: await Promise.all(
          entries.map((entry, index) => imageData(entry.media.coverImage, retina(COVERS[index]))),
        ),
      })),
    ),
    shareBackdrop(),
  ]);
  return imageResponse(
    <PageCover chart={chart} columns={columns} backdrop={backdrop} />,
    periodMaxAge(chart.endsAt),
    PAGE_COVER,
  );
}
