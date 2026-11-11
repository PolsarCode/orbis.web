import { ActionPill, ChipHeader, Footer, Frame, Icon, imageResponse, medals } from "@/lib/facebook-image";
import { weeklyTip } from "@/lib/facebook-tip";
import { clampLines } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";
import { shareBackdrop } from "@/lib/share-backdrop";
import type { Tip } from "@/lib/tips";

const bulbPaths = [
  "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5",
  "M9 18h6",
  "M10 22h4",
];
const { surface, divider } = palette.dark;

function TipImage({ tip, site, backdrop }: { tip: Tip; site: string; backdrop: string }) {
  return (
    <Frame backdrop={backdrop}>
      <ChipHeader chip="TIP OF THE WEEK" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 28,
          marginTop: "auto",
          marginBottom: "auto",
          padding: "56px 56px 60px",
          borderRadius: 32,
          border: `2px solid ${divider}`,
          background: surface,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 999,
            background: "rgba(252, 211, 77, 0.14)",
          }}
        >
          <Icon paths={bulbPaths} color={medals[0]} size={64} />
        </div>
        <div
          style={{
            ...clampLines(3, 76),
            fontFamily: "Barlow Condensed",
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.02,
          }}
        >
          {tip.title}
        </div>
        <div
          style={{
            ...clampLines(8, 34),
            fontSize: 34,
            lineHeight: 1.5,
            color: "rgba(241,237,227,0.86)",
          }}
        >
          {tip.body}
        </div>
        <ActionPill>{tip.action?.label ?? "Try it on Orbis"}</ActionPill>
      </div>
      <Footer caption="A new tip every week" site={site} />
    </Frame>
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tip = weeklyTip(url.searchParams.get("week") ?? "");
  if (!tip) return new Response("Pick a week like 2026-W46.", { status: 404 });

  return imageResponse(
    <TipImage tip={tip} site={url.host} backdrop={await shareBackdrop()} />,
    3600,
  );
}
