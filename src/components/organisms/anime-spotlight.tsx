"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSpotlight, getSpotlights, type AnimeSpotlight as Spotlight } from "@/lib/api";

const SLIDE_MS = 8000;
const DRIFT_MS = 14000;

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

function slideImage(spotlight: Spotlight) {
  return spotlight.bannerImage ?? spotlight.coverImage;
}

const drift: Keyframe[] = [
  { transform: "scale(1.08) translateX(2.5%)" },
  { transform: "scale(1.16) translateX(-2.5%)" },
];

export function AnimeSlideshow({
  overlay,
  linkClassName = "",
}: {
  overlay: string;
  linkClassName?: string;
}) {
  const [slides, setSlides] = useState<Spotlight[]>([]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<string[]>([]);
  const frames = useRef(new Map<string, HTMLDivElement>());
  const count = slides.length;
  const next = count > 0 ? (index + 1) % count : 0;
  const previous = count > 0 ? (index - 1 + count) % count : 0;
  const nextImage = count > 1 ? slideImage(slides[next]) : null;
  const nextReady = nextImage !== null && loaded.includes(nextImage);

  useEffect(() => {
    let active = true;
    getSpotlights()
      .then((list) => {
        const usable = list.filter((spotlight) => slideImage(spotlight));
        if (!active || usable.length === 0) return;
        setSlides(usable);
        setIndex(Math.floor(Math.random() * usable.length));
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const current = slides[index];
    const frame = current && frames.current.get(current.sourceId);
    if (!frame || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    frame.animate(drift, { duration: DRIFT_MS, easing: "linear", fill: "forwards" });
  }, [index, slides]);

  useEffect(() => {
    if (!nextReady) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setTimeout(() => setIndex(next), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, next, nextReady]);

  const shown = slides.flatMap((spotlight, position) => {
    const src = slideImage(spotlight);
    if (!src || ![previous, index, next].includes(position)) return [];
    return [{ spotlight, src, visible: position === index && loaded.includes(src) }];
  });

  return (
    <>
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        {shown.map(({ spotlight, src, visible }) => (
          <div
            key={spotlight.sourceId}
            ref={(element) => {
              if (element) frames.current.set(spotlight.sourceId, element);
              else frames.current.delete(spotlight.sourceId);
            }}
            style={{ transform: "scale(1.08) translateX(2.5%)" }}
            className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out motion-reduce:transition-none ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={src}
              alt=""
              fill
              unoptimized
              loading="eager"
              sizes="100vw"
              onLoad={() =>
                setLoaded((current) => (current.includes(src) ? current : [...current, src]))
              }
              className="object-cover"
            />
          </div>
        ))}
        <div className={`absolute inset-0 ${overlay}`} />
      </div>
      {shown.map(({ spotlight, visible }) => (
        <div
          key={spotlight.sourceId}
          inert={!visible}
          className={`transition-opacity duration-[1500ms] ease-in-out motion-reduce:transition-none ${linkClassName} ${
            visible ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <AnimeSpotlightLink spotlight={spotlight} />
        </div>
      ))}
    </>
  );
}
