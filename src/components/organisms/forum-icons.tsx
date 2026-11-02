"use client";

import { MessagesSquare } from "lucide-react";

const ICON_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const SUGGESTED_ICONS = [
  "megaphone",
  "scroll-text",
  "newspaper",
  "calendar-days",
  "circle-help",
  "lightbulb",
  "users",
  "hand-heart",
  "tv",
  "clapperboard",
  "popcorn",
  "film",
  "book-open",
  "gamepad-2",
  "dice-5",
  "puzzle",
  "music",
  "headphones",
  "mic",
  "camera",
  "palette",
  "brush",
  "pen-tool",
  "image",
  "sparkles",
  "wand-sparkles",
  "star",
  "heart",
  "flame",
  "zap",
  "trophy",
  "crown",
  "sword",
  "swords",
  "shield",
  "drama",
  "ghost",
  "skull",
  "bot",
  "rocket",
  "globe",
  "map",
  "moon",
  "sun",
  "flower",
  "leaf",
  "cat",
  "dog",
  "coffee",
  "pizza",
  "gift",
  "party-popper",
  "laugh",
  "message-circle",
];

let iconIndex: Promise<string[][]> | null = null;

export function loadIconIndex() {
  iconIndex ??= fetch("/category-icons/index.json")
    .then((response) => {
      if (!response.ok) throw new Error("Couldn’t load the icons.");
      return response.json() as Promise<string[][]>;
    })
    .catch((error: Error) => {
      iconIndex = null;
      throw error;
    });
  return iconIndex;
}

export function iconLabel(icon: string | null) {
  if (!icon) return "Speech bubbles";
  const words = icon.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function CategoryGlyph({ icon, size }: { icon: string | null; size: number }) {
  if (!icon || !ICON_NAME.test(icon)) return <MessagesSquare size={size} />;
  const mask = `url(/category-icons/${icon}.svg) center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 bg-current"
      style={{ width: size, height: size, mask, WebkitMask: mask }}
    />
  );
}

export function CategoryIcon({
  icon,
  color,
  size = "large",
}: {
  icon: string | null;
  color: string | null;
  size?: "large" | "small";
}) {
  return (
    <span
      aria-hidden
      style={color ? { color, backgroundColor: `${color}26` } : undefined}
      className={`flex shrink-0 items-center justify-center rounded-lg ${
        color ? "" : "bg-accent-soft text-accent"
      } ${size === "large" ? "h-10 w-10" : "h-8 w-8"}`}
    >
      <CategoryGlyph icon={icon} size={size === "large" ? 18 : 16} />
    </span>
  );
}
