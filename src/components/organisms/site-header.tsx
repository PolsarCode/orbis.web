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
      <div className="mx-auto grid min-h-20 w-full max-w-[1280px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 py-4 lg:grid-cols-[1fr_auto_1fr] px-4 sm:px-8">
        <Atom.Brand />
        <nav
          aria-label="Main navigation"
          className="order-3 col-span-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-[13px] max-sm:hidden lg:order-none lg:col-span-1"
        >
          {[
            { id: "statistics", label: "Statistics" },
            { id: "communities", label: "Communities" },
            { id: "people", label: "People" },
            { id: "features", label: "Features" },
            { id: "also-in-orbis", label: "Also in Orbis" },
          ].map(({ id, label }) =>
            sticky ? (
              <a
                key={id}
                href={`#${id}`}
                className="focus-ring rounded-sm py-2 whitespace-nowrap text-muted transition-colors hover:text-foreground"
              >
                {label}
              </a>
            ) : (
              <Link
                key={id}
                href={`/#${id}`}
                className="focus-ring rounded-sm py-2 whitespace-nowrap text-muted transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ),
          )}
        </nav>
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
