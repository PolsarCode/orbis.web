import { ImageResponse } from "next/og";
import { getCommunity, getStats } from "@/lib/api";
import { imageData, retina } from "@/lib/image-data";
import { clampLines, ogFonts } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";
import { SHARE_IMAGE, shareBackdrop } from "@/lib/share-backdrop";

const { width: WIDTH } = SHARE_IMAGE;
const NUMBER = /^\d{1,9}$/;
const BANNER = { width: WIDTH - 112, height: 280 };
const ICON = { width: 168, height: 168 };
const { background, surface, divider, foreground, muted, accent, accentForeground } = palette.dark;

const confetti = [
  { x: 120, y: 420, size: 18, color: "#fcd34d", turn: 20, round: false },
  { x: 230, y: 330, size: 12, color: "#6fa0f0", turn: 0, round: true },
  { x: 150, y: 700, size: 14, color: accent, turn: -30, round: false },
  { x: 250, y: 860, size: 10, color: "#7cc494", turn: 0, round: true },
  { x: 900, y: 380, size: 16, color: "#b195f2", turn: 40, round: false },
  { x: 820, y: 300, size: 10, color: accent, turn: 0, round: true },
  { x: 940, y: 660, size: 12, color: "#7cc494", turn: 0, round: true },
  { x: 850, y: 860, size: 18, color: "#fcd34d", turn: -15, round: false },
];

const popper = [
  "M5.8 11.3 2 22l10.7-3.79",
  "M4 3h.01",
  "M22 8h.01",
  "M15 2h.01",
  "M22 20h.01",
  "m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10",
  "m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17",
  "m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7",
  "M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z",
];

function milestoneReached(count: number) {
  let reached: number | null = null;
  for (let base = 10; base <= count; base *= 10) {
    for (const step of [1, 2.5, 5]) {
      if (base * step <= count) reached = base * step;
    }
  }
  return reached;
}

type MilestoneCommunity = {
  name: string;
  icon: string | null;
  cover: string | null;
};

function CommunityBanner({ community }: { community: MilestoneCommunity }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 28 }}>
      <div
        style={{
          display: "flex",
          ...BANNER,
          borderRadius: 28,
          border: `2px solid ${divider}`,
          backgroundColor: surface,
          backgroundImage: community.cover
            ? `url(${community.cover})`
            : `linear-gradient(135deg, ${accent}, ${surface})`,
          backgroundSize: "100% 100%",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...ICON,
          marginTop: -ICON.height / 2,
          borderRadius: 44,
          border: `6px solid ${background}`,
          backgroundColor: surface,
          overflow: "hidden",
        }}
      >
        {community.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.icon} width={ICON.width - 12} height={ICON.height - 12} alt="" />
        ) : (
          <div
            style={{
              display: "flex",
              fontFamily: "Barlow Condensed",
              fontSize: 90,
              fontWeight: 800,
              color: accent,
            }}
          >
            {community.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

function MilestoneImage({
  members,
  community,
  link,
  backdrop,
}: {
  members: number;
  community: MilestoneCommunity | null;
  link: string;
  backdrop: string;
}) {
  const count = members.toLocaleString("en-US");
  const ring = community ? 440 : 640;
  const headline = community ? 56 : 64;
  const numberSize = Math.round(ring * (count.length <= 3 ? 0.5 : count.length <= 5 ? 0.36 : 0.28));
  const name = community?.name ?? "Orbis";

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
      {confetti.map(({ x, y, size, color, turn, round }) => (
        <div
          key={`${x}-${y}`}
          style={{
            position: "absolute",
            left: x,
            top: community ? y + 120 : y,
            width: size,
            height: round ? size : size * 0.5,
            borderRadius: round ? size : 3,
            backgroundColor: color,
            transform: `rotate(${turn}deg)`,
            opacity: 0.85,
          }}
        />
      ))}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          fontFamily: "Barlow Condensed",
          fontSize: 64,
          fontWeight: 800,
          color: accent,
          lineHeight: 1,
        }}
      >
        orbis.
      </div>
      {community && <CommunityBanner community={community} />}
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: ring,
            height: ring,
            borderRadius: ring,
            border: `3px solid ${accent}66`,
            backgroundImage: `radial-gradient(circle, ${accent}38 0%, ${accent}00 70%)`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: ring - 64,
              height: ring - 64,
              borderRadius: ring,
              border: `2px dashed ${foreground}26`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 18px",
                borderRadius: 999,
                backgroundColor: accent,
                color: accentForeground,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: 2,
              }}
            >
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke={accentForeground}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {popper.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>
              MILESTONE
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Barlow Condensed",
                fontSize: numberSize,
                fontWeight: 800,
                lineHeight: 1,
                marginTop: 6,
              }}
            >
              {count}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: Math.round(ring * 0.03),
                fontSize: Math.round(ring * 0.055),
                fontWeight: 600,
                letterSpacing: 8,
                color: muted,
              }}
            >
              MEMBERS
            </div>
          </div>
        </div>
        <div
          style={{
            ...clampLines(2, headline),
            marginTop: 40,
            maxWidth: WIDTH - 112,
            fontFamily: "Barlow Condensed",
            fontSize: headline,
            fontWeight: 700,
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          {`${name} just reached ${count} members!`}
        </div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 28, color: muted }}>
          {community
            ? "Thank you to everyone who’s joined. Come say hi on Orbis."
            : "Thank you to everyone who’s joined so far."}
        </div>
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
        <span>{community ? "Community milestone" : "Orbis milestone"}</span>
        <span style={{ color: foreground, fontWeight: 600 }}>{link}</span>
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const members = url.searchParams.get("members") ?? "";
  const communityId = url.searchParams.get("community");
  if (!NUMBER.test(members) || (communityId !== null && !NUMBER.test(communityId))) {
    return new Response("Pick a milestone like 10, 25 or 50.", { status: 400 });
  }
  const count = Number(members);

  let community: MilestoneCommunity | null = null;
  if (communityId) {
    const found = await getCommunity(null, communityId).catch(() => null);
    if (!found?.isPublic || milestoneReached(found.memberCount ?? 0) !== count) {
      return new Response("No milestone for that community.", { status: 404 });
    }
    const [icon, cover] = await Promise.all([
      imageData(found.iconUrl && new URL(found.iconUrl, url.origin).href, retina(ICON)),
      imageData(found.coverUrl && new URL(found.coverUrl, url.origin).href, BANNER),
    ]);
    community = { name: found.name, icon, cover };
  } else if (milestoneReached((await getStats()).members) !== count) {
    return new Response("Orbis hasn’t reached that milestone yet.", { status: 404 });
  }

  return new ImageResponse(
    <MilestoneImage
      members={count}
      community={community}
      link={communityId ? `${url.host}/communities/${communityId}` : url.host}
      backdrop={await shareBackdrop()}
    />,
    {
      ...SHARE_IMAGE,
      fonts: await ogFonts(),
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    },
  );
}
