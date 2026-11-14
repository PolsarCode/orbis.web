import type { MetadataRoute } from "next";
import { getPublicLibraryTitles } from "@/lib/api";
import { mediaPath } from "@/lib/library";
import { SITE_URL } from "@/lib/links";

export const revalidate = 3600;

const pages = ["", "/library", "/changelog", "/guidelines", "/find-us", "/terms", "/privacy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const titles = await getPublicLibraryTitles().catch(() => []);

  return [
    ...pages.map((path) => ({ url: `${SITE_URL}${path}` })),
    ...titles.map(({ type, sourceId, updatedAt }) => ({
      url: `${SITE_URL}${mediaPath(type, sourceId)}`,
      lastModified: updatedAt,
    })),
  ];
}
