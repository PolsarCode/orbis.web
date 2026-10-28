"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, type KeyboardEvent, type ReactNode } from "react";
import * as Template from "@template";
import { useTabScroller } from "@/lib/use-tab-scroller";

export type SettingsTab = {
  key: string;
  label: string;
  icon: ReactNode;
  content: ReactNode;
};

type SettingsTabsProps = { label: string; tabs: SettingsTab[]; aside?: ReactNode };

function Tabs({ label, tabs, aside }: SettingsTabsProps) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const active = tabs.find((tab) => tab.key === params.get("tab")) ?? tabs[0];
  const [tabsRef, tabsFade] = useTabScroller<HTMLDivElement>(active.key);

  function select(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === tabs[0].key) next.delete("tab");
    else next.set("tab", key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.key === active.key);
    const next = tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    select(next.key);
    document.getElementById(`settings-tab-${next.key}`)?.focus();
  }

  return (
    <>
      <div className="flex shrink-0 items-end border-b border-divider px-4 sm:px-8">
        <div
          ref={tabsRef}
          style={tabsFade}
          role="tablist"
          aria-label={label}
          onKeyDown={handleKeyDown}
          className="-mb-px flex min-w-0 items-end gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
        >
          {tabs.map((tab) => {
            const selected = tab.key === active.key;
            return (
              <button
                key={tab.key}
                id={`settings-tab-${tab.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`settings-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(tab.key)}
                className={`focus-ring flex shrink-0 cursor-pointer items-center gap-2 rounded-t-sm border-b-2 px-1 py-3 text-sm whitespace-nowrap transition-colors ${
                  selected
                    ? "border-accent text-accent"
                    : "border-transparent font-semibold text-foreground hover:text-accent"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <Template.PageColumn>
          <div
            role="tabpanel"
            id={`settings-panel-${active.key}`}
            aria-labelledby={`settings-tab-${active.key}`}
            className="flex flex-col gap-4"
          >
            {active.content}
          </div>
        </Template.PageColumn>
        {aside}
      </div>
    </>
  );
}

export function SettingsTabs(props: SettingsTabsProps) {
  return (
    <Suspense fallback={null}>
      <Tabs {...props} />
    </Suspense>
  );
}
