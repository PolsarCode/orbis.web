import {
  getSeason,
  type MediaListItem,
  type MediaSeason,
  type MediaType,
} from "@/lib/api";
import {
  Cover,
  Footer,
  formatName,
  Frame,
  Header,
  imageResponse,
  mediaTypeOf,
  metaLine,
  shortPlatforms,
  typeNames,
} from "@/lib/facebook-image";
import { capitalize, dateChip, seasonId, shortDate, startDate } from "@/lib/library";
import { imageData, retina } from "@/lib/image-data";
import { clampLines } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";
import { SHARE_IMAGE, shareBackdrop } from "@/lib/share-backdrop";

const CONTENT_WIDTH = SHARE_IMAGE.width - 112;
const TILE = { width: (CONTENT_WIDTH - 48) / 4, height: 300 };
const LINEUP = 12;
const COMING = 8;
const { background, surface, divider, muted, accent } = palette.dark;

const sublines: Record<MediaType, { lineup: string; coming: string }> = {
  anime: { lineup: "The new shows to watch this season", coming: "Anime starting next season" },
  manga: { lineup: "The new series to read this season", coming: "Manga starting next season" },
  game: { lineup: "The new games to play this season", coming: "Games coming out next season" },
};

const seasonName = (data: MediaSeason) => `${capitalize(data.season)} ${data.year}`;

function tileMeta(type: MediaType, item: MediaListItem) {
  const start = startDate(type, item.details);
  const lead =
    type === "game"
      ? shortPlatforms(item.details).slice(0, 2).join(" · ")
      : formatName(item.details);
  return [lead, start && shortDate(start)].filter(Boolean).join(" · ");
}

function LineupImage({
  type,
  data,
  items,
  covers,
  site,
  backdrop,
}: {
  type: MediaType;
  data: MediaSeason;
  items: MediaListItem[];
  covers: (string | null)[];
  site: string;
  backdrop: string;
}) {
  const noun = typeNames[type].toLowerCase();

  return (
    <Frame backdrop={backdrop}>
      <Header headline={`${seasonName(data)} ${noun}`} subline={sublines[type].lineup} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 28 }}>
        {items.map((item, index) => (
          <div
            key={item.sourceId}
            style={{
              ...TILE,
              display: "flex",
              position: "relative",
              overflow: "hidden",
              borderRadius: 18,
              border: `2px solid ${divider}`,
              backgroundColor: surface,
              backgroundImage: covers[index] ? `url(${covers[index]})` : "none",
              backgroundSize: "100% 100%",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                ...TILE,
                backgroundImage:
                  "linear-gradient(to top, rgba(0,0,0,0.92), rgba(0,0,0,0.4) 45%, rgba(0,0,0,0))",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                gap: 4,
                width: "100%",
                padding: 14,
                color: "#ffffff",
              }}
            >
              <div
                style={{
                  ...clampLines(2, 26),
                  fontFamily: "Barlow Condensed",
                  fontSize: 26,
                  fontWeight: 700,
                  lineHeight: 1.05,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  display: "block",
                  fontSize: 17,
                  color: "rgba(255,255,255,0.78)",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {tileMeta(type, item)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Footer caption={`New ${noun} every season`} site={site} />
    </Frame>
  );
}

const comingRowHeight = (count: number) => Math.min(176, Math.floor(900 / Math.max(count, 1)));

function comingCover(rowHeight: number) {
  const height = rowHeight - 24;
  return { width: Math.round(height * 0.7), height };
}

function DateChip({ item, type }: { item: MediaListItem; type: MediaType }) {
  const start = startDate(type, item.details);
  if (!start) return <div style={{ display: "flex", width: 84, flexShrink: 0 }} />;
  const { top, day } = dateChip(start);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        width: 84,
        height: 84,
        borderRadius: 16,
        background,
        border: `2px solid ${divider}`,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: day ? 17 : 22,
          fontWeight: 600,
          color: accent,
          letterSpacing: 1,
        }}
      >
        {top}
      </div>
      {day && (
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow Condensed",
            fontSize: 40,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {day}
        </div>
      )}
    </div>
  );
}

function ComingImage({
  type,
  data,
  items,
  covers,
  site,
  backdrop,
}: {
  type: MediaType;
  data: MediaSeason;
  items: MediaListItem[];
  covers: (string | null)[];
  site: string;
  backdrop: string;
}) {
  const rowHeight = comingRowHeight(items.length);
  const big = rowHeight > 140;

  return (
    <Frame backdrop={backdrop}>
      <Header headline={`Coming in ${seasonName(data)}`} subline={sublines[type].coming} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 28,
          background: surface,
          border: `2px solid ${divider}`,
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        {items.map((item, index) => (
          <div
            key={item.sourceId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              height: rowHeight,
              padding: "0 28px",
              borderTop: index === 0 ? "none" : `2px solid ${divider}`,
            }}
          >
            <DateChip item={item} type={type} />
            <Cover src={covers[index]} size={comingCover(rowHeight)} radius={big ? 12 : 8} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 4 }}>
              <div
                style={
                  big
                    ? { ...clampLines(2, 32), fontSize: 32, fontWeight: 600, lineHeight: 1.2 }
                    : {
                        display: "block",
                        fontSize: 28,
                        fontWeight: 600,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }
                }
              >
                {item.title}
              </div>
              <div style={{ display: "flex", fontSize: big ? 22 : 20, color: muted }}>
                {metaLine(type, item.details)}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Footer caption={`Next season’s ${typeNames[type].toLowerCase()}`} site={site} />
    </Frame>
  );
}

function byStartDate(type: MediaType) {
  const time = (item: MediaListItem) => startDate(type, item.details)?.date.getTime() ?? Infinity;
  return (a: MediaListItem, b: MediaListItem) => time(a) - time(b);
}

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const type = mediaTypeOf((await params).type);
  const url = new URL(request.url);
  const season = url.searchParams.get("season") ?? "";
  const lineup = season === seasonId(0);
  if (!type || (!lineup && season !== seasonId(1))) {
    return new Response("Not found.", { status: 404 });
  }

  let data: MediaSeason | null;
  try {
    data = await getSeason(null, type, season);
  } catch {
    return new Response("This season isn’t available right now.", { status: 502 });
  }
  if (!data?.items.length) return new Response("No titles for this season.", { status: 404 });

  const items = lineup
    ? data.items.slice(0, LINEUP)
    : [...data.items].sort(byStartDate(type)).slice(0, COMING);
  const size = lineup ? retina(TILE) : retina(comingCover(comingRowHeight(items.length)));
  const [covers, backdrop] = await Promise.all([
    Promise.all(items.map((item) => imageData(item.coverImage, size))),
    shareBackdrop(),
  ]);
  const props = { type, data, items, covers, site: url.host, backdrop };
  return imageResponse(lineup ? <LineupImage {...props} /> : <ComingImage {...props} />, 3600);
}
