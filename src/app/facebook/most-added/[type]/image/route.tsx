import { getMostAdded, type MediaType, type MostAdded } from "@/lib/api";
import {
  Cover,
  daysRange,
  Footer,
  Frame,
  Header,
  imageResponse,
  isDate,
  medals,
  mediaTypeOf,
  number,
  periodMaxAge,
  typeNames,
} from "@/lib/facebook-image";
import { imageData, retina } from "@/lib/image-data";
import { palette } from "@/lib/palette";
import { shareBackdrop } from "@/lib/share-backdrop";

const TOP = 5;
const COVER = { width: 96, height: 136 };
const { surface, divider, foreground, muted, accent } = palette.dark;

function MostAddedImage({
  type,
  data,
  items,
  covers,
  site,
  backdrop,
}: {
  type: MediaType;
  data: MostAdded;
  items: MostAdded["items"];
  covers: (string | null)[];
  site: string;
  backdrop: string;
}) {
  const max = Math.max(...items.map(({ adds }) => adds), 1);

  return (
    <Frame backdrop={backdrop}>
      <Header
        headline={`Most added ${typeNames[type].toLowerCase()} this week`}
        subline={`On Orbis · ${daysRange(data.startsAt, data.endsAt)}`}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 28 }}>
        {items.map(({ media, adds }, index) => (
          <div
            key={media.sourceId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              height: 176,
              padding: "0 28px",
              borderRadius: 24,
              border: `2px solid ${divider}`,
              background: surface,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                width: 56,
                fontFamily: "Barlow Condensed",
                fontSize: 60,
                fontWeight: 800,
                color: medals[index] ?? foreground,
              }}
            >
              {index + 1}
            </div>
            <Cover src={covers[index]} size={COVER} radius={10} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 12 }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{ display: "flex", flex: 1, height: 14, borderRadius: 999, background: divider }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: `${(adds / max) * 100}%`,
                      height: 14,
                      borderRadius: 999,
                      background: accent,
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    width: 140,
                    flexShrink: 0,
                    justifyContent: "flex-end",
                    fontSize: 22,
                    color: muted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {`+${number(adds)} added`}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Footer caption="From what Orbis members added to their libraries" site={site} />
    </Frame>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const type = mediaTypeOf((await params).type);
  const url = new URL(request.url);
  const until = url.searchParams.get("until") ?? "";
  if (!type || !isDate(until)) return new Response("Not found.", { status: 404 });

  let data: MostAdded;
  try {
    data = await getMostAdded(type, until);
  } catch {
    return new Response("The most added titles aren’t available right now.", { status: 502 });
  }
  const items = data.items.slice(0, TOP);
  if (!items.length) return new Response("Nothing was added that week.", { status: 404 });

  const [covers, backdrop] = await Promise.all([
    Promise.all(items.map(({ media }) => imageData(media.coverImage, retina(COVER)))),
    shareBackdrop(),
  ]);
  return imageResponse(
    <MostAddedImage
      type={type}
      data={data}
      items={items}
      covers={covers}
      site={url.host}
      backdrop={backdrop}
    />,
    periodMaxAge(data.endsAt),
  );
}
