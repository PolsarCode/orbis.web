import { ImageResponse } from "next/og";
import { ogFonts } from "@/lib/og-fonts";
import { palette } from "@/lib/palette";

export const alt = "Orbis — Your fandom. Your people.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const { background, foreground, muted, accent } = palette.light;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 28,
            padding: "0 64px",
          }}
        >
          <div
            style={{
              fontFamily: "Barlow Condensed",
              fontSize: 64,
              fontWeight: 800,
              color: accent,
              lineHeight: 1,
            }}
          >
            orbis.
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: -14,
              fontSize: 20,
              letterSpacing: 1.2,
              color: muted,
            }}
          >
            By
            <span style={{ color: foreground, fontWeight: 600 }}>Polsar Studio</span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Barlow Condensed",
              fontSize: 88,
              fontWeight: 700,
              color: foreground,
              lineHeight: 1.04,
            }}
          >
            <span>Your fandom.</span>
            <span>Your people.</span>
          </div>
          <div style={{ fontSize: 26, color: muted, lineHeight: 1.35 }}>
            Communities, feeds, and a library for everything you’re watching,
            reading, and playing.
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
