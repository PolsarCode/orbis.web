"use client";

import { Tooltip } from "antd";
import { LayoutGrid, List } from "lucide-react";
import type { ReactNode } from "react";

export const cardListViews = [
  { value: "cards", label: "Cards", icon: <LayoutGrid size={16} /> },
  { value: "list", label: "List", icon: <List size={16} /> },
] as const;

export function ViewToggle<T extends string>({
  label,
  options,
  view,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string; icon: ReactNode }[];
  view: T;
  onChange: (view: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-0.5">
      {options.map((option) => (
        <Tooltip key={option.value} title={option.label}>
          <button
            type="button"
            aria-label={option.label}
            aria-pressed={view === option.value}
            onClick={() => onChange(option.value)}
            className={`icon-button cursor-pointer ${
              view === option.value ? "bg-rail-item text-foreground" : ""
            }`}
          >
            {option.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
