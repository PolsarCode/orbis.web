import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { avatarTone } from "@/lib/avatar-tone";
import { palette } from "@/lib/palette";

const SIZE = 256;
const backgrounds = [palette.dark.accentSoft, palette.dark.railItem];

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const initial =
    Array.from(new URL(request.url).searchParams.get("initial") ?? "")[0]?.toUpperCase() ?? "";
  const font = await readFile(join(process.cwd(), "src/app/fonts/BarlowCondensed-Bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: backgrounds[avatarTone(userId)],
          color: palette.dark.foreground,
          fontFamily: "Barlow Condensed",
          fontWeight: 700,
          fontSize: SIZE * 0.55,
        }}
      >
        {initial}
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      fonts: [{ name: "Barlow Condensed", data: font, weight: 700, style: "normal" }],
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    },
  );
}
