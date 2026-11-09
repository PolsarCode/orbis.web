import { ImageResponse } from "next/og";
import type { CSSProperties } from "react";
import sharp from "sharp";
import { getChart, type Chart, type ChartEntry, type ChartMovement, type MediaType } from "@/lib/api";
import { countLabel } from "@/lib/library";
import { ogFonts } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";
import { weekRange } from "@/lib/time";

const WIDTH = 1080;
const HEIGHT = 1350;
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
const titles: Record<MediaType, string> = { anime: "Anime", manga: "Manga", game: "Games" };
const medals = ["#fcd34d", "#e4e4e7", "#fdba74"];
const crownPaths = [
  "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
  "M5 21h14",
];
const { background, surface, divider, foreground, muted, accent, accentForeground, online, danger } =
  palette.dark;

const arrows: Record<Exclude<ChartMovement, "new">, { color: string; paths: string[] }> = {
  up: { color: online, paths: ["m5 12 7-7 7 7", "M12 19V5"] },
  down: { color: danger, paths: ["M12 5v14", "m19 12-7 7-7-7"] },
  same: { color: muted, paths: ["M5 12h14"] },
};

const ORBIT = { x: WIDTH / 2, y: 104 };
const rings = [
  { radius: 150, dashed: false },
  { radius: 250, dashed: true },
  { radius: 370, dashed: false },
  { radius: 510, dashed: true },
  { radius: 670, dashed: false },
  { radius: 860, dashed: true },
];
const planets = [
  { ring: 1, angle: 200, size: 7 },
  { ring: 2, angle: 18, size: 9 },
  { ring: 3, angle: 162, size: 6 },
];

function orbitPoint(radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: ORBIT.x + radius * Math.cos(radians), y: ORBIT.y + radius * Math.sin(radians) };
}

const patternSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="${ORBIT.x}" cy="${ORBIT.y}" r="640" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.24"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="${foreground}" fill-opacity="0.07"/>
    </pattern>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0.3"/>
    </linearGradient>
    <mask id="dotsFade"><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#fade)"/></mask>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#dots)" mask="url(#dotsFade)"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)"/>
  ${rings
    .map(
      ({ radius, dashed }) =>
        `<circle cx="${ORBIT.x}" cy="${ORBIT.y}" r="${radius}" fill="none" stroke="${foreground}" stroke-opacity="0.07" stroke-width="2"${dashed ? ' stroke-dasharray="3 12" stroke-linecap="round"' : ""}/>`,
    )
    .join("")}
  ${planets
    .map(({ ring, angle, size }) => {
      const { x, y } = orbitPoint(rings[ring].radius, angle);
      return `<circle cx="${x}" cy="${y}" r="${size}" fill="${accent}" fill-opacity="0.55"/>`;
    })
    .join("")}
</svg>`;

let pattern: Promise<string> | null = null;

function patternData() {
  pattern ??= sharp(Buffer.from(patternSvg))
    .png()
    .toBuffer()
    .then((png) => `data:image/png;base64,${png.toString("base64")}`);
  return pattern;
}

type Size = { width: number; height: number };
type Images = { cover: string | null; backdrop: string | null };

async function imageData(src: string | null, { width, height }: Size, blur = false) {
  if (!src) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    let image = sharp(Buffer.from(await res.arrayBuffer())).resize(width, height, { fit: "cover" });
    if (blur) image = image.blur(24).modulate({ brightness: 0.8 });
    const jpeg = await image.jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

function retina({ width, height }: Size): Size {
  return { width: width * 2, height: height * 2 };
}

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

function Icon({ paths, color, size }: { paths: string[]; color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
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
  return <Icon paths={paths} color={color} size={size} />;
}

function Cover({ src, size, radius }: { src: string | null; size: Size; radius: number }) {
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

const clamp = (lines: number): CSSProperties => ({
  display: "block",
  overflow: "hidden",
  lineClamp: lines,
});

function PodiumCard({ entry, images }: { entry: ChartEntry; images: Images }) {
  const featured = entry.rank === 1;
  const size = featured ? FEATURED : RUNNER_UP;
  const medal = medals[entry.rank - 1];

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
              {featured && <Icon paths={crownPaths} color={medal} size={50} />}
              {`#${entry.rank}`}
            </div>
            <Movement movement={entry.movement} size={featured ? 40 : 34} />
          </div>
          <div
            style={{
              ...clamp(2),
              fontFamily: "Barlow Condensed",
              fontSize: featured ? 44 : 30,
              fontWeight: 700,
              lineHeight: 1.05,
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
            fontSize: 54,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {`Top ${entries.length} ${titles[type]} of the week`}
        </div>
        <div style={{ marginTop: 8, fontSize: 26, color: muted }}>
          {weekRange(chart.startsAt, chart.endsAt)}
        </div>
      </div>
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
  const [images, backdrop] = await Promise.all([
    Promise.all(entries.map(loadImages)),
    patternData(),
  ]);
  const maxAge = new Date(chart.endsAt).getTime() <= Date.now() ? 604800 : 3600;
  return new ImageResponse(
    <ChartImage
      chart={chart}
      type={type}
      entries={entries}
      images={images}
      site={url.host}
      backdrop={backdrop}
    />,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: await ogFonts(),
      headers: { "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}` },
    },
  );
}
