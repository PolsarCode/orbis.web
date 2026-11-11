import { getCommunityWeekly, type CommunityWeekly } from "@/lib/api";
import {
  ActionPill,
  Banner,
  BANNER,
  ChipHeader,
  Footer,
  Frame,
  Icon,
  imageResponse,
  isDate,
  number,
  periodMaxAge,
  plural,
} from "@/lib/facebook-image";
import { imageData, retina } from "@/lib/image-data";
import { initials } from "@/lib/initials";
import { clampLines } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";
import { shareBackdrop } from "@/lib/share-backdrop";

const NUMBER = /^\d{1,9}$/;
const ICON = { width: 200, height: 200 };
const NAME_SIZE = 72;
const badgePaths = [
  "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z",
  "m9 12 2 2 4-4",
];
const { background, surface, muted, accent } = palette.dark;

function CommunityIcon({ name, src }: { name: string; src: string | null }) {
  return (
    <div
      style={{
        ...ICON,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: 44,
        border: `6px solid ${background}`,
        backgroundColor: surface,
        backgroundImage: src ? `url(${src})` : "none",
        backgroundSize: "100% 100%",
        boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
      }}
    >
      {!src && (
        <div
          style={{
            display: "flex",
            fontFamily: "Barlow Condensed",
            fontSize: 110,
            fontWeight: 800,
            color: accent,
          }}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );
}

function CommunityImage({
  community,
  icon,
  cover,
  site,
  backdrop,
}: {
  community: CommunityWeekly;
  icon: string | null;
  cover: string | null;
  site: string;
  backdrop: string;
}) {
  return (
    <Frame backdrop={backdrop}>
      {cover && <Banner src={cover} />}
      <ChipHeader chip="COMMUNITY OF THE WEEK" shadow />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 300,
          gap: 18,
        }}
      >
        <CommunityIcon name={community.name} src={icon} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            maxWidth: "100%",
            gap: 14,
          }}
        >
          <div
            style={{
              ...clampLines(2, NAME_SIZE),
              flexShrink: 1,
              textAlign: "center",
              fontFamily: "Barlow Condensed",
              fontSize: NAME_SIZE,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {community.name}
          </div>
          {community.isVerified && (
            <div style={{ display: "flex", flexShrink: 0 }}>
              <Icon paths={badgePaths} color={accent} size={48} weight={2.5} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, color: muted }}>
          <span>{`Public community · ${plural(community.members, "member")}`}</span>
          <div
            style={{
              display: "flex",
              padding: "4px 14px",
              borderRadius: 999,
              background: "rgba(110, 180, 120, 0.18)",
              color: "#8fd19a",
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            {`+${number(community.gained)} this week`}
          </div>
        </div>
        {community.description && (
          <div
            style={{
              ...clampLines(3, 30),
              maxWidth: 860,
              textAlign: "center",
              fontSize: 30,
              lineHeight: 1.45,
              color: "rgba(241,237,227,0.86)",
            }}
          >
            {community.description}
          </div>
        )}
        <ActionPill>Join them on Orbis</ActionPill>
      </div>
      <Footer caption="A new community every week" site={site} />
    </Frame>
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ communityId: string }> },
) {
  const { communityId } = await params;
  const url = new URL(request.url);
  const until = url.searchParams.get("until") ?? "";
  if (!NUMBER.test(communityId) || !isDate(until)) {
    return new Response("Not found.", { status: 404 });
  }

  let community: CommunityWeekly | null;
  try {
    community = await getCommunityWeekly(Number(communityId), until);
  } catch {
    return new Response("This community isn’t available right now.", { status: 502 });
  }
  if (!community) return new Response("Community not found.", { status: 404 });

  const [icon, cover, backdrop] = await Promise.all([
    imageData(community.iconUrl && new URL(community.iconUrl, url.origin).href, retina(ICON)),
    imageData(community.coverUrl && new URL(community.coverUrl, url.origin).href, BANNER),
    shareBackdrop(),
  ]);
  return imageResponse(
    <CommunityImage
      community={community}
      icon={icon}
      cover={cover}
      site={url.host}
      backdrop={backdrop}
    />,
    periodMaxAge(community.endsAt),
  );
}
