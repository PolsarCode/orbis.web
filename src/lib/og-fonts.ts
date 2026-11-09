import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImageResponse } from "next/og";

type Fonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]>;

const font = (file: string) => readFile(join(process.cwd(), "src/app/fonts", file));

export async function ogFonts(): Promise<Fonts> {
  const [regular, semiBold, bold, extraBold] = await Promise.all([
    font("Inter-Regular.ttf"),
    font("Inter-SemiBold.ttf"),
    font("BarlowCondensed-Bold.ttf"),
    font("BarlowCondensed-ExtraBold.ttf"),
  ]);

  return [
    { name: "Inter", data: regular, weight: 400, style: "normal" },
    { name: "Inter", data: semiBold, weight: 600, style: "normal" },
    { name: "Barlow Condensed", data: bold, weight: 700, style: "normal" },
    { name: "Barlow Condensed", data: extraBold, weight: 800, style: "normal" },
  ];
}
