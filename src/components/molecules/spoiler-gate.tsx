"use client";

import { EyeOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import * as Atom from "@atom";
import { spoilerLabel } from "@/lib/spoiler";

export function SpoilerGate({
  spoiler,
  children,
}: {
  spoiler: string | null | undefined;
  children: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  if (spoiler === null || spoiler === undefined) return <>{children}</>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-divider bg-rail-item px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <EyeOff size={16} aria-hidden className="shrink-0 text-muted" />
          <span className="truncate font-semibold">{spoilerLabel(spoiler)}</span>
        </span>
        <Atom.Button
          size="small"
          variant="secondary"
          aria-expanded={shown}
          onClick={(event) => {
            event.stopPropagation();
            setShown((current) => !current);
          }}
        >
          {shown ? "Hide" : "Show"}
        </Atom.Button>
      </div>
      {shown && children}
    </div>
  );
}
