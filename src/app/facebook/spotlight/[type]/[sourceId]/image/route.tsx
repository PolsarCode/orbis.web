import { AdultTitleError, getMediaProfile, type MediaProfile, type MediaType } from "@/lib/api";
import {
  Banner,
  BANNER,
  ChipHeader,
  Cover,
  Footer,
  Frame,
  imageResponse,
  medals,
  mediaTypeOf,
  metaLine,
} from "@/lib/facebook-image";
import { imageData, retina } from "@/lib/image-data";
import { clampLines } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";
import { shareBackdrop } from "@/lib/share-backdrop";

const COVER = { width: 240, height: 340 };
const GENRES = 4;
const { background, surface, divider, muted } = palette.dark;

const chips: Record<MediaType, string> = {
  anime: "ANIME SPOTLIGHT",
  manga: "MANGA SPOTLIGHT",
  game: "GAME SPOTLIGHT",
};
const captions: Record<MediaType, string> = {
  anime: "Find your next watch on Orbis",
  manga: "Find your next read on Orbis",
  game: "Find your next game on Orbis",
};

function Pill({ children, score = false }: { children: string; score?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        padding: "6px 14px",
        borderRadius: 999,
        fontSize: 20,
        ...(score
          ? { background: medals[0], color: background, fontWeight: 600 }
          : { border: `2px solid ${divider}`, background: surface }),
      }}
    >
      {children}
    </div>
  );
}

function SpotlightImage({
  type,
  media,
  banner,
  cover,
  site,
  backdrop,
}: {
  type: MediaType;
  media: MediaProfile;
  banner: string | null;
  cover: string | null;
  site: string;
  backdrop: string;
}) {
  return (
    <Frame backdrop={backdrop}>
      {banner && <Banner src={banner} />}
      <ChipHeader chip={chips[type]} shadow />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 32, marginTop: 330 }}>
        <Cover src={cover} size={COVER} radius={18} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 12 }}>
          <div
            style={{
              ...clampLines(3, 60),
              fontFamily: "Barlow Condensed",
              fontSize: 60,
              fontWeight: 800,
              lineHeight: 1.02,
            }}
          >
            {media.title}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: muted }}>
            {metaLine(type, media.details, true)}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {media.score !== null && <Pill score>{`★ ${media.score.toFixed(1)}`}</Pill>}
            {media.genres.slice(0, GENRES).map((genre) => (
              <Pill key={genre}>{genre}</Pill>
            ))}
          </div>
        </div>
      </div>
      {media.synopsis && (
        <div
          style={{
            ...clampLines(7, 27),
            marginTop: 32,
            fontSize: 27,
            lineHeight: 1.45,
            color: "rgba(241,237,227,0.86)",
          }}
        >
          {media.synopsis}
        </div>
      )}
      <Footer caption={captions[type]} site={site} />
    </Frame>
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string; sourceId: string }> },
) {
  const { type: segment, sourceId } = await params;
  const type = mediaTypeOf(segment);
  if (!type) return new Response("Not found.", { status: 404 });

  let media: MediaProfile | null;
  try {
    media = await getMediaProfile(null, type, sourceId);
  } catch (error) {
    if (error instanceof AdultTitleError) return new Response("Not found.", { status: 404 });
    return new Response("This title isn’t available right now.", { status: 502 });
  }
  if (!media) return new Response("Title not found.", { status: 404 });

  const [banner, cover, backdrop] = await Promise.all([
    imageData(media.bannerImage ?? media.coverImage, BANNER, !media.bannerImage),
    imageData(media.coverImage, retina(COVER)),
    shareBackdrop(),
  ]);
  return imageResponse(
    <SpotlightImage
      type={type}
      media={media}
      banner={banner}
      cover={cover}
      site={new URL(request.url).host}
      backdrop={backdrop}
    />,
    3600,
  );
}
