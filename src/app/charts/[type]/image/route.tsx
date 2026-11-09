import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getChart, type Chart, type ChartEntry, type ChartMovement, type MediaType } from "@/lib/api";
import { countLabel } from "@/lib/library";
import { ogFonts } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";
import { weekRange } from "@/lib/time";

const WIDTH = 1080;
const HEIGHT = 1350;
const TOP = 10;
const COVER = { width: 52, height: 74 };
const titles: Record<MediaType, string> = { anime: "Anime", manga: "Manga", game: "Games" };
const { background, surface, divider, foreground, muted, accent, accentForeground, online, danger } =
  palette.dark;

const arrows: Record<Exclude<ChartMovement, "new">, { color: string; paths: string[] }> = {
  up: { color: online, paths: ["m5 12 7-7 7 7", "M12 19V5"] },
  down: { color: danger, paths: ["M12 5v14", "m19 12-7 7-7-7"] },
  same: { color: muted, paths: ["M5 12h14"] },
};

async function coverData(src: string | null) {
  if (!src) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(COVER.width * 2, COVER.height * 2, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

function Movement({ movement }: { movement: ChartMovement }) {
  if (movement === "new") {
    return (
      <div
        style={{
          display: "flex",
          padding: "4px 10px",
          borderRadius: 999,
          background: accent,
          color: accentForeground,
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        NEW
      </div>
    );
  }

  const { color, paths } = arrows[movement];
  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function Row({ entry, cover, first }: { entry: ChartEntry; cover: string | null; first: boolean }) {
  const { media } = entry;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        height: 94,
        padding: "0 32px",
        borderTop: first ? "none" : `2px solid ${divider}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: 56,
          fontFamily: "Barlow Condensed",
          fontSize: 50,
          fontWeight: 800,
        }}
      >
        {entry.rank}
      </div>
      <div style={{ display: "flex", justifyContent: "center", width: 68 }}>
        <Movement movement={entry.movement} />
      </div>
      <div
        style={{
          ...COVER,
          borderRadius: 8,
          backgroundColor: divider,
          backgroundImage: cover ? `url(${cover})` : "none",
          backgroundSize: "100% 100%",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 6 }}>
        <div
          style={{
            display: "block",
            fontSize: 30,
            fontWeight: 600,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {media.title}
        </div>
        <div style={{ display: "flex", fontSize: 22, color: muted }}>{countLabel(media)}</div>
      </div>
    </div>
  );
}

function ChartImage({
  chart,
  type,
  entries,
  covers,
  site,
}: {
  chart: Chart;
  type: MediaType;
  entries: ChartEntry[];
  covers: (string | null)[];
  site: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "56px 64px",
        background,
        color: foreground,
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          fontFamily: "Barlow Condensed",
          fontSize: 44,
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
        }}
      >
        orbis.
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: "Barlow Condensed",
          fontSize: 84,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {`Top ${entries.length} ${titles[type]} of the week`}
      </div>
      <div style={{ marginTop: 14, fontSize: 28, color: muted }}>
        {weekRange(chart.startsAt, chart.endsAt)}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 36,
          background: surface,
          border: `2px solid ${divider}`,
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        {entries.map((entry, index) => (
          <Row key={entry.media.id} entry={entry} cover={covers[index]} first={index === 0} />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "auto",
          fontSize: 24,
          color: muted,
        }}
      >
        <span>Weekly charts, every Monday</span>
        <span style={{ color: foreground, fontWeight: 600 }}>{site}</span>
      </div>
    </div>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type: segment } = await params;
  const type = (Object.keys(titles) as MediaType[]).find((value) => value === segment);
  if (!type) return new Response("Not found.", { status: 404 });

  const url = new URL(request.url);
  let chart: Chart | null;
  try {
    chart = await getChart(null, type, url.searchParams.get("week") ?? undefined);
  } catch {
    return new Response("This chart isn’t available right now.", { status: 502 });
  }
  if (!chart?.entries.length) return new Response("No chart for this week.", { status: 404 });

  const entries = chart.entries.slice(0, TOP);
  const covers = await Promise.all(entries.map((entry) => coverData(entry.media.coverImage)));
  const maxAge = new Date(chart.endsAt).getTime() <= Date.now() ? 604800 : 3600;
  return new ImageResponse(
    <ChartImage chart={chart} type={type} entries={entries} covers={covers} site={url.host} />,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: await ogFonts(),
      headers: { "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}` },
    },
  );
}
