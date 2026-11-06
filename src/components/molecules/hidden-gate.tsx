"use client";

import { EyeOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import * as Atom from "@atom";
import type { HiddenBecause } from "@/lib/api";

function hiddenLabel(hiddenBecause: HiddenBecause) {
  if (hiddenBecause.kind === "muted") return "From someone you muted";
  if (hiddenBecause.kind === "blocked") return "Message from someone you blocked";
  return `Hidden because it mentions “${hiddenBecause.phrase}”`;
}

export function HiddenGate({
  hiddenBecause,
  className = "",
  children,
}: {
  hiddenBecause: HiddenBecause | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  if (!hiddenBecause || shown) return <>{children}</>;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border border-dashed border-divider bg-rail-item px-3 py-2 ${className}`}
    >
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <EyeOff size={16} aria-hidden className="shrink-0 text-muted" />
        <span className="truncate font-semibold">{hiddenLabel(hiddenBecause)}</span>
      </span>
      <Atom.Button
        size="small"
        variant="secondary"
        onClick={(event) => {
          event.stopPropagation();
          setShown(true);
        }}
      >
        {hiddenBecause.kind === "filtered" ? "Show anyway" : "Show"}
      </Atom.Button>
    </div>
  );
}
