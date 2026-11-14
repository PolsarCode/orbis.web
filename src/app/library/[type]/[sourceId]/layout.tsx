import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getMediaProfile } from "@/lib/api";
import { mediaPath } from "@/lib/library";

type Props = { params: Promise<{ type: string; sourceId: string }> };

const DESCRIPTION_LENGTH = 160;

function summary(synopsis: string | null) {
  if (!synopsis) return undefined;
  const text = synopsis.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > DESCRIPTION_LENGTH ? `${text.slice(0, DESCRIPTION_LENGTH - 1).trimEnd()}…` : text;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, sourceId } = await params;
  const profile = await getMediaProfile(null, type, sourceId).catch(() => null);
  if (!profile) return { title: "Catalog" };

  const title = `${profile.title} - Catalog`;
  const description = summary(profile.synopsis);
  const images = profile.coverImage ? [profile.coverImage] : undefined;

  return {
    title,
    description,
    alternates: { canonical: mediaPath(profile.type, profile.sourceId) },
    openGraph: { type: "website", siteName: "Orbis", title, description, images },
    twitter: { card: images ? "summary" : "summary_large_image", title, description, images },
  };
}

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
