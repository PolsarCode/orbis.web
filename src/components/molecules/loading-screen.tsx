"use client";

import { useSyncExternalStore } from "react";
import * as Atom from "@atom";
import { tips } from "@/lib/tips";

const noSubscription = () => () => {};

let tipIndex: number | undefined;

function pickTip() {
  tipIndex ??= Math.floor(Math.random() * tips.length);
  return tipIndex;
}

export function LoadingScreen({
  status,
  leaving = false,
}: {
  status?: string;
  leaving?: boolean;
}) {
  const index = useSyncExternalStore(noSubscription, pickTip, () => null);
  const tip = index === null ? null : tips[index];

  return (
    <div
      role="status"
      aria-label="Loading Orbis"
      data-tauri-drag-region
      className={`fixed inset-0 z-[1500] flex flex-col items-center bg-background px-4 font-sans transition-opacity duration-300 motion-reduce:transition-none ${
        leaving ? "pointer-events-none opacity-0" : ""
      }`}
    >
      <div className="flex-1" />
      <div className="relative flex">
        <span
          aria-hidden
          className="flex font-display text-[72px] leading-none font-extrabold text-accent motion-reduce:animate-pulse"
        >
          <Atom.LogoMark animation="loop" />
        </span>
        {status && (
          <p className="absolute top-full left-1/2 mt-4 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 text-center text-sm text-muted">
            {status}
          </p>
        )}
      </div>
      <div className="flex flex-1 flex-col justify-end">
        <div className="flex max-w-sm flex-col items-center gap-1 pt-14 pb-10 text-center sm:pb-16">
          {tip && (
            <>
              <p className="text-xs font-bold text-accent uppercase">Did you know</p>
              <p className="font-semibold">{tip.title}</p>
              <p className="text-sm text-muted">{tip.body}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
