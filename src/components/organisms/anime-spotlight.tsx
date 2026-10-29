"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSpotlight, type AnimeSpotlight as Spotlight } from "@/lib/api";

export function useAnimeSpotlight() {
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);

  useEffect(() => {
    let active = true;
    getSpotlight()
      .then((value) => {
        if (active) setSpotlight(value);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  return spotlight;
}

export function AnimeBackdrop({
  spotlight,
  overlay,
}: {
  spotlight: Spotlight | null;
  overlay: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const src = spotlight?.bannerImage ?? spotlight?.coverImage;

  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {src && (
        <Image
          src={src}
          alt=""
          fill
          unoptimized
          priority
          sizes="100vw"
          onLoad={() => setLoaded(true)}
          className={`object-cover transition-opacity duration-700 motion-reduce:transition-none ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      <div className={`absolute inset-0 ${overlay}`} />
    </div>
  );
}

export function AnimeSpotlightLink({
  spotlight,
  className = "",
}: {
  spotlight: Spotlight | null;
  className?: string;
}) {
  if (!spotlight) return null;

  return (
    <Link
      href={`/library/anime/${spotlight.sourceId}`}
      className={`focus-ring group inline-flex max-w-full items-center gap-3 rounded-full border border-divider bg-surface/85 py-2 pr-4 pl-2 text-sm shadow-lg backdrop-blur transition-colors hover:bg-surface ${className}`}
    >
      {spotlight.coverImage && (
        <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full">
          <Image src={spotlight.coverImage} alt="" fill unoptimized sizes="36px" className="object-cover" />
        </span>
      )}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="text-[10px] font-semibold tracking-wide text-muted uppercase">
          In Orbis libraries
        </span>
        <span className="truncate font-semibold">{spotlight.title}</span>
      </span>
      <ArrowRight
        size={16}
        aria-hidden
        className="shrink-0 text-accent transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

export function AnimeSpotlight({
  overlay,
  linkClassName,
}: {
  overlay: string;
  linkClassName?: string;
}) {
  const spotlight = useAnimeSpotlight();

  return (
    <>
      <AnimeBackdrop spotlight={spotlight} overlay={overlay} />
      <AnimeSpotlightLink spotlight={spotlight} className={linkClassName} />
    </>
  );
}
