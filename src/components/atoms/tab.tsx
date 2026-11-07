import Link from "next/link";
import type { ComponentProps } from "react";

const tabBase =
  "focus-ring flex shrink-0 items-center gap-2 rounded-t-sm border-b-2 px-1 py-3 text-sm transition-colors";

function tabTone(active: boolean) {
  return active
    ? "border-accent text-accent"
    : "border-transparent font-semibold text-foreground hover:text-accent";
}

export function TabLink({
  active,
  className = "",
  ...props
}: ComponentProps<typeof Link> & { active: boolean }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`${tabBase} ${className} ${tabTone(active)}`}
      {...props}
    />
  );
}

export function TabButton({
  active,
  className = "",
  ...props
}: ComponentProps<"button"> & { active: boolean }) {
  return (
    <button
      type="button"
      className={`${tabBase} cursor-pointer whitespace-nowrap ${className} ${tabTone(active)}`}
      {...props}
    />
  );
}
