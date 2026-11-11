import type { CSSProperties } from "react";
import { getChart, type Chart, type ChartEntry, type ChartMovement, type MediaType } from "@/lib/api";
import {
  Cover,
  crownPaths,
  Footer,
  Frame,
  Header,
  Icon,
  imageResponse,
  medals,
  mediaTypeOf,
  periodMaxAge,
  typeNames,
} from "@/lib/facebook-image";
import { imageData, retina } from "@/lib/image-data";
import { countLabel } from "@/lib/library";
import { palette } from "@/lib/palette";
import { SHARE_IMAGE, shareBackdrop } from "@/lib/share-backdrop";
import { weekRange } from "@/lib/time";

const { width: WIDTH } = SHARE_IMAGE;
const TOP = 10;
const PODIUM = 3;
const CONTENT_WIDTH = WIDTH - 112;
const FEATURED = { width: CONTENT_WIDTH, height: 236 };
const RUNNER_UP = { width: (CONTENT_WIDTH - 16) / 2, height: 186 };
const COVERS = {
  featured: { width: 112, height: 160 },
  runnerUp: { width: 84, height: 120 },
  row: { width: 46, height: 66 },
};
const { surface, divider, muted, accent, accentForeground, online, danger } = palette.dark;

const arrows: Record<Exclude<ChartMovement, "new">, { color: string; paths: string[] }> = {
  up: { color: online, paths: ["m5 12 7-7 7 7", "M12 19V5"] },
  down: { color: danger, paths: ["M12 5v14", "m19 12-7 7-7-7"] },
  same: { color: muted, paths: ["M5 12h14"] },
};

type Images = { cover: string | null; backdrop: string | null };

async function loadImages(entry: ChartEntry, index: number): Promise<Images> {
  const { coverImage, bannerImage } = entry.media;
  const card = index === 0 ? FEATURED : index < PODIUM ? RUNNER_UP : null;
  const cover = index === 0 ? COVERS.featured : index < PODIUM ? COVERS.runnerUp : COVERS.row;
  const [coverData, backdrop] = await Promise.all([
    imageData(coverImage, retina(cover)),
    card ? imageData(bannerImage ?? coverImage, card, !bannerImage) : Promise.resolve(null),
  ]);
  return { cover: coverData, backdrop };
}

function Movement({ movement, size }: { movement: ChartMovement; size: number }) {
  if (movement === "new") {
    return (
      <div
        style={{
          display: "flex",
          padding: "4px 10px",
          borderRadius: 999,
          background: accent,
          color: accentForeground,
          fontSize: Math.round(size * 0.45),
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        NEW
      </div>
    );
  }

  const { color, paths } = arrows[movement];
  return <Icon paths={paths} color={color} size={size} weight={3} />;
}

const clamp = (lines: number): CSSProperties => ({
  display: "block",
  overflow: "hidden",
  lineClamp: lines,
});

function PodiumCard({ entry, images }: { entry: ChartEntry; images: Images }) {
  const featured = entry.rank === 1;
  const size = featured ? FEATURED : RUNNER_UP;
  const medal = medals[entry.rank - 1];
  const titleSize = featured ? 44 : 30;

  return (
    <div
      style={{
        ...size,
        display: "flex",
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        border: `2px solid ${divider}`,
        backgroundColor: surface,
      }}
    >
      {images.backdrop && (
        <div
          style={{
            ...size,
            position: "absolute",
            top: 0,
            left: 0,
            backgroundImage: `url(${images.backdrop})`,
            backgroundSize: "100% 100%",
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size.width,
          height: size.height,
          backgroundImage:
            "linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.12))",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: featured ? 26 : 20,
          width: "100%",
          padding: featured ? 22 : 18,
          color: "#ffffff",
        }}
      >
        <Cover
          src={images.cover}
          size={featured ? COVERS.featured : COVERS.runnerUp}
          radius={featured ? 14 : 10}
        />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: medal,
                fontFamily: "Barlow Condensed",
                fontSize: featured ? 64 : 46,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {featured && <Icon paths={crownPaths} color={medal} size={50} weight={3} />}
              {`#${entry.rank}`}
            </div>
            <Movement movement={entry.movement} size={featured ? 40 : 34} />
          </div>
          <div
            style={{
              ...clamp(2),
              fontFamily: "Barlow Condensed",
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.05,
              paddingBottom: titleSize * 0.2,
              marginBottom: titleSize * -0.2,
            }}
          >
            {entry.media.title}
          </div>
          <div style={{ display: "flex", fontSize: featured ? 24 : 20, color: "rgba(255,255,255,0.78)" }}>
            {countLabel(entry.media)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ entry, cover, first }: { entry: ChartEntry; cover: string | null; first: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        height: 78,
        padding: "0 30px",
        borderTop: first ? "none" : `2px solid ${divider}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: 50,
          fontFamily: "Barlow Condensed",
          fontSize: 46,
          fontWeight: 800,
        }}
      >
        {entry.rank}
      </div>
      <div style={{ display: "flex", justifyContent: "center", width: 64 }}>
        <Movement movement={entry.movement} size={34} />
      </div>
      <Cover src={cover} size={COVERS.row} radius={8} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 4 }}>
        <div
          style={{
            display: "block",
            fontSize: 28,
            fontWeight: 600,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {entry.media.title}
        </div>
        <div style={{ display: "flex", fontSize: 20, color: muted }}>{countLabel(entry.media)}</div>
      </div>
    </div>
  );
}

function ChartImage({
  chart,
  type,
  entries,
  images,
  site,
  backdrop,
}: {
  chart: Chart;
  type: MediaType;
  entries: ChartEntry[];
  images: Images[];
  site: string;
  backdrop: string;
}) {
  const podium = entries.slice(0, PODIUM);
  const rest = entries.slice(PODIUM);

  return (
    <Frame backdrop={backdrop}>
      <Header
        headline={`Top ${entries.length} ${typeNames[type]} of the week`}
        subline={weekRange(chart.startsAt, chart.endsAt)}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        {podium[0] && <PodiumCard entry={podium[0]} images={images[0]} />}
        {podium.length > 1 && (
          <div style={{ display: "flex", gap: 16 }}>
            {podium.slice(1).map((entry, index) => (
              <PodiumCard key={entry.media.id} entry={entry} images={images[index + 1]} />
            ))}
          </div>
        )}
        {rest.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: surface,
              border: `2px solid ${divider}`,
              borderRadius: 24,
              overflow: "hidden",
            }}
          >
            {rest.map((entry, index) => (
              <Row
                key={entry.media.id}
                entry={entry}
                cover={images[index + PODIUM].cover}
                first={index === 0}
              />
            ))}
          </div>
        )}
      </div>
      <Footer caption="Weekly charts, every Monday" site={site} />
    </Frame>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const type = mediaTypeOf((await params).type);
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
  const [images, backdrop] = await Promise.all([
    Promise.all(entries.map(loadImages)),
    shareBackdrop(),
  ]);
  return imageResponse(
    <ChartImage
      chart={chart}
      type={type}
      entries={entries}
      images={images}
      site={url.host}
      backdrop={backdrop}
    />,
    periodMaxAge(chart.endsAt),
  );
}
