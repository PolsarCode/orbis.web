"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import * as Atom from "@atom";
import { SidePanelOpener } from "./side-panel";

export function SiteHeader({ sticky = false }: { sticky?: boolean }) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!sticky || !header) return;
    const root = document.documentElement;
    const updateHeight = () => {
      root.style.setProperty(
        "--landing-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--landing-header-height");
    };
  }, [sticky]);

  return (
    <header
      ref={headerRef}
      className={`border-b border-divider/70 bg-background/95 ${sticky ? "sticky top-0 z-40 backdrop-blur-md" : ""}`}
    >
      <div className="mx-auto grid min-h-20 w-full max-w-[1280px] grid-cols-[1fr_auto] items-center gap-x-4 py-4 px-4 sm:px-8">
        <Atom.Brand />
        <div className="flex items-center justify-end gap-3 text-[13px] sm:gap-6">
          <Link
            href="/login"
            className="focus-ring rounded-sm px-2 py-1 hover:text-accent"
          >
            Log in
          </Link>
          <Atom.ButtonLink href="/register">Sign up</Atom.ButtonLink>
          <SidePanelOpener hiddenOffset="-ml-3 sm:-ml-6" />
        </div>
      </div>
    </header>
  );
}
