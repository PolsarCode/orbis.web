"use client";

import { Drawer } from "antd";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { useIsDesktop } from "@/lib/use-is-desktop";
import { useLayoutStore } from "@/stores/layout-store";

const PANEL_WIDTH = 288;

export function SidePanel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const isDesktop = useIsDesktop();
  const collapsed = useLayoutStore((state) => state.panelCollapsed);
  const drawerOpen = useLayoutStore((state) => state.drawerOpen);
  const closeDrawer = useLayoutStore((state) => state.closeDrawer);

  useLayoutEffect(() => {
    useLayoutStore.getState().restorePanel();
    return () => useLayoutStore.getState().closeDrawer();
  }, []);

  useEffect(() => {
    useLayoutStore.getState().setPanelLabel(label);
    return () => useLayoutStore.getState().setPanelLabel(null);
  }, [label]);

  if (isDesktop) {
    return (
      <aside
        data-tour="side-panel"
        id="side-panel"
        aria-label={label}
        aria-hidden={collapsed}
        inert={collapsed}
        className={`hidden shrink-0 overflow-hidden border-divider bg-surface transition-[width] duration-300 ease-out motion-reduce:transition-none lg:flex ${
          collapsed ? "w-0" : "w-72 border-l"
        }`}
      >
        <div className="flex w-72 shrink-0 flex-col gap-6 overflow-y-auto p-6 pb-[max(1.5rem,var(--feedback-dock-space,0px))]">
          {children}
        </div>
      </aside>
    );
  }

  return (
    <Drawer
      open={drawerOpen}
      onClose={closeDrawer}
      placement="right"
      size={PANEL_WIDTH}
      title={null}
      closable={false}
      destroyOnHidden
      styles={{ body: { padding: 24 } }}
    >
      <div id="side-panel" aria-label={label} className="flex flex-col gap-6">
        {children}
      </div>
    </Drawer>
  );
}

export function SidePanelOpener({
  hiddenOffset = "-ml-1 sm:-ml-2",
}: {
  hiddenOffset?: string;
}) {
  const isDesktop = useIsDesktop();
  const label = useLayoutStore((state) => state.panelLabel);
  const collapsed = useLayoutStore((state) => state.panelCollapsed);
  const togglePanel = useLayoutStore((state) => state.togglePanel);

  if (!label) return null;

  const shown = !isDesktop || collapsed;
  const title = `Show ${label.toLowerCase()}`;
  return (
    <div
      inert={!shown}
      className={`flex shrink-0 transition-[width,margin-left,opacity] duration-300 ease-out motion-reduce:transition-none ${
        shown ? "w-10 opacity-100 delay-100" : `w-0 opacity-0 ${hiddenOffset}`
      }`}
    >
      <button
        type="button"
        aria-label={title}
        aria-expanded={false}
        aria-controls="side-panel"
        onClick={() => togglePanel(isDesktop)}
        className="focus-ring relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-rail-item motion-reduce:transition-none"
      >
        <PanelRightOpen size={20} />
      </button>
    </div>
  );
}

export function PanelHeading({
  title,
  label,
}: {
  title: string;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <SidePanelToggle label={label} />
    </div>
  );
}

export function SidePanelToggle({ label }: { label: string }) {
  const isDesktop = useIsDesktop();
  const collapsed = useLayoutStore((state) => state.panelCollapsed);
  const drawerOpen = useLayoutStore((state) => state.drawerOpen);
  const togglePanel = useLayoutStore((state) => state.togglePanel);
  const open = isDesktop ? !collapsed : drawerOpen;
  const title = `${open ? "Hide" : "Show"} ${label.toLowerCase()}`;

  if (!isDesktop) return null;

  return (
    <button
      type="button"
      aria-label={title}
      aria-expanded={open}
      aria-controls="side-panel"
      onClick={() => togglePanel(isDesktop)}
      className="icon-button"
    >
      {open ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
    </button>
  );
}
