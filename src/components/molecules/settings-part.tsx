import type { ReactNode } from "react";

export function SettingsPart({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 py-6 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
