"use client";

import { Select } from "antd";
import { EyeOff, Flag, Inbox, KanbanSquare, List } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import * as Template from "@template";
import { getReportAdmins, type Report, type ReportAdmin } from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { useTabScroller } from "@/lib/use-tab-scroller";
import { useAuthStore } from "@/stores/auth-store";
import { MyReports } from "./my-reports";
import { ReportedContent } from "./reported-content";
import {
  AdminsPanel,
  DiscordWebhookButton,
  HiddenReports,
  ReportBoard,
  ReportModal,
  categoryStyle,
  type ReportFilter,
  type ReportView,
} from "./report-board";
import { SidePanel } from "./side-panel";
import { PageTour } from "./onboarding";
import { SearchScope } from "./site-search";

const tabs = [
  { value: "board", label: "Board", icon: <KanbanSquare size={16} /> },
  { value: "hidden", label: "Hidden", icon: <EyeOff size={16} /> },
  { value: "reported", label: "Reported", icon: <Flag size={16} /> },
] as const;

type Tab = (typeof tabs)[number]["value"];

const content = "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pt-6 pb-24 sm:px-8 sm:pt-8";

const reportViews = [
  { value: "board", label: "Board", icon: <KanbanSquare size={16} /> },
  { value: "list", label: "List", icon: <List size={16} /> },
] as const;

function AdminReports() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const profile = useAuthStore((state) => state.profile);
  const requested = params.get("tab");
  const tab: Tab = tabs.find(({ value }) => value === requested)?.value ?? "board";
  const [tabsRef, tabsFade] = useTabScroller<HTMLDivElement>(tab);
  const reportParam = Number(params.get("report"));
  const openReport = Number.isInteger(reportParam) && reportParam > 0 ? reportParam : null;
  const [admins, setAdmins] = useState<ReportAdmin[] | null>(null);
  const [views, setViews] = useState<Record<Tab, ReportView>>({
    board: "board",
    hidden: "list",
    reported: "list",
  });
  const [filter, setFilter] = useState<ReportFilter>({ assignee: "anyone", category: "all" });
  const [patch, setPatch] = useState<Report | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getReportAdmins(token)
      .then(setAdmins)
      .catch(() => setAdmins([]));
  }, []);

  function setOpenReport(id: number | null) {
    const next = new URLSearchParams(params);
    if (id === null) next.delete("report");
    else next.set("report", String(id));
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const listProps = { onOpen: setOpenReport, filter, view: views[tab], patch };

  return (
    <>
      <SearchScope lead="tickets" />
      <Template.PageHeader>
        <Atom.Heading>Reports</Atom.Heading>
      </Template.PageHeader>
      <nav
        aria-label="Report sections"
        className="flex shrink-0 items-end gap-6 border-b border-divider px-4 max-sm:flex-wrap max-sm:gap-y-0 sm:px-8"
      >
        <div
          ref={tabsRef}
          style={tabsFade}
          data-tour="reports-tabs"
          className="-mb-px flex min-w-0 items-end gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
        >
          {tabs.map(({ value, label, icon }) => (
            <Atom.TabLink
              key={value}
              href={value === "board" ? "/reports" : `/reports?tab=${value}`}
              active={tab === value}
              className="whitespace-nowrap"
            >
              {icon}
              {label}
            </Atom.TabLink>
          ))}
        </div>
        <div
          data-tour="reports-filters"
          className={`ml-auto flex shrink-0 items-center gap-2 self-center max-sm:order-first max-sm:ml-0 max-sm:w-full max-sm:pt-3 ${tab === "reported" ? "invisible max-sm:hidden" : ""}`}
        >
          <Select<ReportFilter["assignee"]>
            size="small"
            aria-label="Assigned to"
            value={filter.assignee}
            onChange={(assignee) => setFilter({ ...filter, assignee })}
            popupMatchSelectWidth={false}
            className="w-36"
            options={[
              { value: "anyone", label: "Anyone" },
              { value: "me", label: "Assigned to me" },
              { value: "unassigned", label: "Unassigned" },
              ...(admins ?? [])
                .filter((admin) => admin.id !== profile?.userId)
                .map((admin) => ({ value: admin.id, label: displayName(admin) })),
            ]}
          />
          <Select<ReportFilter["category"]>
            size="small"
            aria-label="Type"
            value={filter.category}
            onChange={(category) => setFilter({ ...filter, category })}
            popupMatchSelectWidth={false}
            className="w-32"
            options={[
              {
                value: "all",
                label: (
                  <span className="flex items-center gap-1.5">
                    <Inbox size={12} />
                    All types
                  </span>
                ),
              },
              ...(Object.keys(categoryStyle) as (keyof typeof categoryStyle)[]).map((value) => ({
                value,
                label: (
                  <span className="flex items-center gap-1.5">
                    {categoryStyle[value].icon}
                    {categoryStyle[value].label}s
                  </span>
                ),
              })),
            ]}
          />
          <Molecule.ViewToggle
            label="Report view"
            options={reportViews}
            view={views[tab]}
            onChange={(view) => setViews({ ...views, [tab]: view })}
          />
        </div>
        {profile?.isHeadAdmin && (
          <span
            data-tour="reports-discord"
            className="flex shrink-0 self-center max-sm:order-first max-sm:pt-2"
          >
            <DiscordWebhookButton />
          </span>
        )}
      </nav>
      <div className="flex min-h-0 flex-1">
        <div className={content}>
          {tab === "reported" ? (
            <ReportedContent />
          ) : tab === "hidden" ? (
            <HiddenReports {...listProps} />
          ) : (
            <ReportBoard {...listProps} />
          )}
        </div>
        <SidePanel label="Admins">
          <AdminsPanel admins={admins} />
        </SidePanel>
      </div>
      <PageTour name="reports" />
      <ReportModal
        reportId={openReport}
        admins={admins ?? []}
        onClose={() => setOpenReport(null)}
        onChange={setPatch}
      />
    </>
  );
}

export function ReportsView() {
  const profile = useAuthStore((state) => state.profile);

  if (profile?.isAdmin) return <AdminReports />;

  return (
    <>
      <Template.PageHeader>
        <Atom.Heading>Reports</Atom.Heading>
      </Template.PageHeader>
      <div className={content}>
        {!profile ? (
          <Atom.Loader />
        ) : (
          <div className="mx-auto flex w-full max-w-[672px] flex-col gap-8 lg:max-w-[760px] xl:max-w-[880px] 2xl:max-w-[1040px]">
            <MyReports />
          </div>
        )}
      </div>
    </>
  );
}
