import {
  getChart,
  getChartDiscussion,
  type Chart,
  type ChartDiscussion,
  type ChartEntry,
  type MediaType,
} from "@/lib/api";
import {
  Cover,
  Footer,
  Frame,
  Header,
  imageResponse,
  medals,
  mediaTypeOf,
  number,
  typeNames,
  WEEK,
} from "@/lib/facebook-image";
import { imageData, retina } from "@/lib/image-data";
import { clampLines } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";
import { shareBackdrop } from "@/lib/share-backdrop";
import { weekRange } from "@/lib/time";

const PODIUM = [
  { width: 330, height: 470 },
  { width: 260, height: 370 },
  { width: 260, height: 370 },
];
const ORDER = [1, 0, 2];
const { surface, divider, muted, accent } = palette.dark;

function DebateImage({
  type,
  chart,
  comments,
  covers,
  site,
  backdrop,
}: {
  type: MediaType;
  chart: Chart;
  comments: number;
  covers: (string | null)[];
  site: string;
  backdrop: string;
}) {
  const podium: [ChartEntry, number][] = ORDER.filter((index) => chart.entries[index]).map(
    (index) => [chart.entries[index], index],
  );

  const range = weekRange(chart.startsAt, chart.endsAt);

  return (
    <Frame backdrop={backdrop}>
      <Header
        headline="Join the debate"
        subline={`This week’s ${typeNames[type].toLowerCase()} chart · ${range}`}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
          gap: 24,
          marginTop: 44,
        }}
      >
        {podium.map(([entry, index]) => {
          const size = PODIUM[index];
          const titleSize = index === 0 ? 30 : 24;
          return (
            <div
              key={entry.media.sourceId}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: size.width,
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontFamily: "Barlow Condensed",
                  fontSize: index === 0 ? 64 : 48,
                  fontWeight: 800,
                  color: medals[index],
                  lineHeight: 1,
                }}
              >
                {`#${entry.rank}`}
              </div>
              <Cover src={covers[index]} size={size} radius={index === 0 ? 20 : 16} />
              <div
                style={{
                  ...clampLines(2, titleSize),
                  textAlign: "center",
                  fontFamily: "Barlow Condensed",
                  fontSize: titleSize,
                  fontWeight: 700,
                  lineHeight: 1.05,
                }}
              >
                {entry.media.title}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          marginTop: 44,
          padding: "28px 32px",
          borderRadius: 28,
          border: `2px solid ${divider}`,
          background: surface,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Barlow Condensed",
              fontSize: 72,
              fontWeight: 800,
              color: accent,
              lineHeight: 1,
            }}
          >
            {number(comments)}
          </div>
          <div style={{ display: "flex", fontFamily: "Barlow Condensed", fontSize: 40, fontWeight: 700 }}>
            {comments === 1 ? "comment so far" : "comments so far"}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: muted }}>
          Does #1 deserve it? Tell everyone on Orbis.
        </div>
      </div>
      <Footer caption="Weekly chart discussion" site={site} />
    </Frame>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const type = mediaTypeOf((await params).type);
  const url = new URL(request.url);
  const week = url.searchParams.get("week") ?? undefined;
  if (!type || (week !== undefined && !WEEK.test(week))) {
    return new Response("Not found.", { status: 404 });
  }

  let chart: Chart | null;
  let discussion: ChartDiscussion | null = null;
  try {
    chart = await getChart(null, type, week);
    if (chart) discussion = await getChartDiscussion(null, type, chart.week);
  } catch {
    return new Response("This chart isn’t available right now.", { status: 502 });
  }
  if (!chart?.entries.length || !discussion?.commentCount) {
    return new Response("No discussion for this chart.", { status: 404 });
  }

  const top = chart.entries.slice(0, PODIUM.length);
  const [covers, backdrop] = await Promise.all([
    Promise.all(top.map((entry, index) => imageData(entry.media.coverImage, retina(PODIUM[index])))),
    shareBackdrop(),
  ]);
  return imageResponse(
    <DebateImage
      type={type}
      chart={chart}
      comments={discussion.commentCount}
      covers={covers}
      site={url.host}
      backdrop={backdrop}
    />,
    300,
  );
}
