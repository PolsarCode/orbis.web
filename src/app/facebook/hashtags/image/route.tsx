import type { CSSProperties } from "react";
import { getWeeklyTags, type WeeklyTags } from "@/lib/api";
import {
  daysRange,
  Footer,
  Frame,
  Header,
  Icon,
  imageResponse,
  isDate,
  medals,
  number,
  periodMaxAge,
  plural,
} from "@/lib/facebook-image";
import { palette } from "@/lib/palette";
import { shareBackdrop } from "@/lib/share-backdrop";

const TOP = 8;
const trendingPaths = ["M16 7h6v6", "m22 7-8.5 8.5-5-5L2 17"];
const { surface, divider, foreground, muted, accent } = palette.dark;

const oneLine: CSSProperties = {
  display: "block",
  flexShrink: 1,
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

function Hashtag({ display }: { display: string }) {
  return (
    <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
      <span style={{ color: accent }}>#</span>
      <div style={oneLine}>{display}</div>
    </div>
  );
}

function HashtagsImage({
  data,
  tags,
  site,
  backdrop,
}: {
  data: WeeklyTags;
  tags: WeeklyTags["tags"];
  site: string;
  backdrop: string;
}) {
  const [top, ...rest] = tags;

  return (
    <Frame backdrop={backdrop}>
      <Header
        headline="Trending on Orbis"
        subline={`Top hashtags this week · ${daysRange(data.startsAt, data.endsAt)}`}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          marginTop: 28,
          padding: "28px 36px",
          borderRadius: 28,
          border: `2px solid ${accent}`,
          background: surface,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 22,
              fontWeight: 600,
              color: medals[0],
              letterSpacing: 2,
            }}
          >
            <Icon paths={trendingPaths} color={medals[0]} size={28} weight={2.5} />
            #1 THIS WEEK
          </div>
          <div
            style={{
              display: "flex",
              fontFamily: "Barlow Condensed",
              fontSize: 96,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            <Hashtag display={top.display} />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Barlow Condensed",
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {number(top.people)}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: muted }}>
            {top.people === 1 ? "person" : "people"}
          </div>
        </div>
      </div>
      {rest.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 16,
            background: surface,
            border: `2px solid ${divider}`,
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          {rest.map((tag, index) => (
            <div
              key={tag.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                height: 96,
                padding: "0 36px",
                borderTop: index === 0 ? "none" : `2px solid ${divider}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 44,
                  flexShrink: 0,
                  fontFamily: "Barlow Condensed",
                  fontSize: 46,
                  fontWeight: 800,
                  color: medals[index + 1] ?? foreground,
                }}
              >
                {index + 2}
              </div>
              <div style={{ display: "flex", flex: 1, minWidth: 0, fontSize: 36, fontWeight: 600 }}>
                <Hashtag display={tag.display} />
              </div>
              <div style={{ display: "flex", flexShrink: 0, fontSize: 24, color: muted }}>
                {plural(tag.people, "person", "people")}
              </div>
            </div>
          ))}
        </div>
      )}
      <Footer caption="Follow a hashtag to see it in your feed" site={site} />
    </Frame>
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const until = url.searchParams.get("until") ?? "";
  if (!isDate(until)) return new Response("Not found.", { status: 404 });

  let data: WeeklyTags;
  try {
    data = await getWeeklyTags(until);
  } catch {
    return new Response("Trending hashtags aren’t available right now.", { status: 502 });
  }
  const tags = data.tags.slice(0, TOP);
  if (!tags.length) return new Response("No hashtags that week.", { status: 404 });

  return imageResponse(
    <HashtagsImage data={data} tags={tags} site={url.host} backdrop={await shareBackdrop()} />,
    periodMaxAge(data.endsAt),
  );
}
