import { getChart, type Chart, type MediaListItem, type MediaType } from "@/lib/api";
import { imageResponse, periodMaxAge, WEEK, Wordmark } from "@/lib/facebook-image";
import { imageData, retina } from "@/lib/image-data";
import { palette } from "@/lib/palette";
import { weekRange } from "@/lib/time";

const PAGE_COVER = { width: 1640, height: 856 };
const GAP = 8;
const COVER_RATIO = 0.7;
const TILT_DEGREES = -12;
const types: MediaType[] = ["anime", "manga", "game"];
const { accent, accentForeground } = palette.dark;
const ink = (opacity: number) => `rgba(14,14,13,${opacity})`;

function rowItems(charts: (Chart | null)[]) {
  const lists = charts.map((chart) =>
    (chart?.entries ?? []).flatMap((entry) => (entry.media.coverImage ? [entry.media] : [])),
  );
  const fallback = lists.flat();
  return lists.map((list) => (list.length ? list : fallback));
}

function tiltScale({ width, height }: typeof PAGE_COVER) {
  const angle = (Math.abs(TILT_DEGREES) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return Math.max((width * cos + height * sin) / width, (width * sin + height * cos) / height) + 0.04;
}

async function wall(lists: MediaListItem[][], size: typeof PAGE_COVER) {
  const scale = tiltScale(size);
  const tileHeight = Math.round((size.height - GAP * (lists.length - 1)) / lists.length);
  const tileWidth = Math.round(tileHeight * COVER_RATIO);
  const columns = Math.ceil((size.width + GAP) / (tileWidth + GAP)) + 2;
  const hidden = Math.ceil(((scale - 1) * size.width) / 2 / (tileWidth + GAP));
  const rows = await Promise.all(
    lists.map(async (list) => {
      const covers = await Promise.all(
        list.map((item) => imageData(item.coverImage, retina({ width: tileWidth, height: tileHeight }))),
      );
      return Array.from(
        { length: columns },
        (_, column) => covers[(((column - hidden) % covers.length) + covers.length) % covers.length],
      );
    }),
  );
  return { rows, tileWidth, tileHeight, scale };
}

function Tile({ src, width, height }: { src: string | null; width: number; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        flexShrink: 0,
        borderRadius: 10,
        backgroundColor: "#2a2a27",
        backgroundImage: src ? `url(${src})` : "none",
        backgroundSize: "100% 100%",
      }}
    />
  );
}

function PageCover({
  range,
  rows,
  tileWidth,
  tileHeight,
  scale,
}: {
  range: string;
  rows: (string | null)[][];
  tileWidth: number;
  tileHeight: number;
  scale: number;
}) {
  const { width, height } = PAGE_COVER;
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#121211",
        color: "#ffffff",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          flexDirection: "column",
          gap: GAP,
          width,
          height,
          overflow: "hidden",
          transform: `rotate(${TILT_DEGREES}deg) scale(${scale})`,
        }}
      >
        {rows.map((row, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              gap: GAP,
              marginLeft: index % 2 === 0 ? -tileWidth / 2 : -tileWidth - GAP,
            }}
          >
            {row.map((src, column) => (
              <Tile key={column} src={src} width={tileWidth} height={tileHeight} />
            ))}
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          backgroundImage: `radial-gradient(ellipse 46% 60% at 50% 50%, ${ink(0.9)} 0%, ${ink(0.72)} 45%, ${ink(0.18)} 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <Wordmark size={128} shadow />
        <div
          style={{
            display: "flex",
            padding: "8px 20px",
            borderRadius: 999,
            background: accent,
            color: accentForeground,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 3,
          }}
        >
          TRENDING THIS WEEK
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "rgba(255,255,255,0.86)",
            textShadow: "0 2px 8px rgba(0,0,0,0.7)",
          }}
        >
          {range}
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
  const chart = charts.find((item) => item?.entries.length);
  const lists = rowItems(charts);
  if (!chart || lists.every((list) => list.length === 0)) {
    return new Response("No charts for this week.", { status: 404 });
  }

  const { rows, tileWidth, tileHeight, scale } = await wall(lists, PAGE_COVER);
  return imageResponse(
    <PageCover
      range={weekRange(chart.startsAt, chart.endsAt)}
      rows={rows}
      tileWidth={tileWidth}
      tileHeight={tileHeight}
      scale={scale}
    />,
    periodMaxAge(chart.endsAt),
    PAGE_COVER,
  );
}
