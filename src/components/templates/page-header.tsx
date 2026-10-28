import type { ReactNode } from "react";

export function PageHeader({
  children,
  tagline,
  center,
  actions,
}: {
  children: ReactNode;
  tagline?: string;
  center?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header
      className={`flex h-14 shrink-0 items-center gap-3 border-b border-divider px-4 sm:h-[72px] sm:gap-6 sm:px-8 ${
        tagline || actions || center ? "" : "authenticated:hidden"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 authenticated:sm:invisible">
        {children}
      </div>
      {center && <div className="w-full max-w-md min-w-0">{center}</div>}
      {tagline && (
        <p className="hidden shrink-0 text-xs text-muted uppercase md:block">
          {tagline}
        </p>
      )}
      {actions && (
        <div className="flex shrink-0 items-center justify-end gap-1">
          {actions}
        </div>
      )}
    </header>
  );
}
