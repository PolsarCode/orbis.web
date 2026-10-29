import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { palette } from "@/lib/palette";

export const alt = "Orbis — Your fandom. Your people.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [illustration, regular, semiBold, bold, extraBold] = await Promise.all([
    readFile(join(process.cwd(), "public/images/landing-illustration.jpg"), "base64"),
    readFile(join(process.cwd(), "src/app/fonts/Inter-Regular.ttf")),
    readFile(join(process.cwd(), "src/app/fonts/Inter-SemiBold.ttf")),
    readFile(join(process.cwd(), "src/app/fonts/BarlowCondensed-Bold.ttf")),
    readFile(join(process.cwd(), "src/app/fonts/BarlowCondensed-ExtraBold.ttf")),
  ]);
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
        <img
          src={`data:image/jpeg;base64,${illustration}`}
          width={630}
          height={630}
          alt=""
          style={{ objectFit: "cover" }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: semiBold, weight: 600, style: "normal" },
        { name: "Barlow Condensed", data: bold, weight: 700, style: "normal" },
        { name: "Barlow Condensed", data: extraBold, weight: 800, style: "normal" },
      ],
    },
  );
}
