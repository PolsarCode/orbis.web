"use client";

import { App } from "antd";
import { Boxes, CloudOff, Flag, MessageSquare, Newspaper, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  getReportedItems,
  resolveReportedItem,
  type ContentReportTarget,
  type ReportedItem,
} from "@/lib/api";
import { displayName } from "@/lib/display-name";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { reportReasons } from "./report-content";
import { SearchScope } from "./site-search";

const targetStyle: Record<ContentReportTarget, { label: string; icon: ReactNode }> = {
  post: { label: "Post", icon: <Newspaper size={12} /> },
  comment: { label: "Comment", icon: <MessageSquare size={12} /> },
  user: { label: "Profile", icon: <UserRound size={12} /> },
  community: { label: "Community", icon: <Boxes size={12} /> },
};

const reasonLabel = (reason: string) =>
  reportReasons.find(({ value }) => value === reason)?.label ?? reason;

function matches(item: ReportedItem, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  return [
    item.target?.title,
    item.target?.excerpt,
    item.target?.author?.username,
    item.target?.author?.name,
    ...Object.keys(item.reasons).map(reasonLabel),
    ...item.reports.flatMap(({ details, reporter }) => [details, reporter.username, reporter.name]),
  ].some((value) => value?.toLowerCase().includes(text));
}

const SEARCH_LIMIT = 8;

function ReportedSearchScope({ items }: { items: ReportedItem[] }) {
  return (
    <SearchScope
      lead="tickets"
      section={{
        label: "Reported",
        render: (query) => {
          const shown = items.filter((item) => item.target && matches(item, query)).slice(0, SEARCH_LIMIT);

          if (shown.length === 0) {
            return (
              <p className="py-4 text-center text-sm text-muted">
                No reported content matches “{query}”.
              </p>
            );
          }

          return (
            <ul>
              {shown.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <Link
                    href={item.target!.link}
                    className="focus-ring flex flex-col rounded-md px-2 py-2 text-foreground transition-colors hover:bg-rail-item/60 hover:text-foreground"
                  >
                    <span className="truncate text-sm font-semibold">{item.target!.title}</span>
                    <span className="truncate text-xs text-muted">
                      {targetStyle[item.type].label} · Reported{" "}
                      {item.count === 1 ? "once" : `${item.count} times`}
                      {item.target!.excerpt ? ` · ${item.target!.excerpt}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          );
        },
      }}
    />
  );
}

export function ReportedContent() {
  const { message } = App.useApp();
  const [items, setItems] = useState<ReportedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getReportedItems(token)
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function resolve(item: ReportedItem, resolution: "resolved" | "dismissed") {
    const { token } = useAuthStore.getState();
    if (!token) return;

    const key = `${item.type}-${item.id}`;
    setPending(`${key}-${resolution}`);
    try {
      await resolveReportedItem(token, item, resolution);
      setItems((current) => current?.filter((other) => `${other.type}-${other.id}` !== key) ?? null);
      message.success(resolution === "resolved" ? "Marked as resolved." : "Report dismissed.");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  if (error) {
    return (
      <Molecule.FeedState
        role="alert"
        eyebrow="Reported"
        icon={<CloudOff size={24} strokeWidth={1.5} />}
        title="Reported content couldn’t be loaded."
        description={error}
      />
    );
  }

  if (!items) return <Molecule.FeedSkeleton label="Loading reported content…" />;

  if (items.length === 0) {
    return (
      <Molecule.FeedState
        eyebrow="All clear"
        icon={<Flag size={24} strokeWidth={1.5} />}
        title="Nothing has been reported."
        description="When someone reports a post, comment, profile or community, it shows up here."
      />
    );
  }

  return (
    <ul className="mx-auto flex w-full max-w-[880px] flex-col gap-3">
      <ReportedSearchScope items={items} />
      {items.map((item) => {
        const key = `${item.type}-${item.id}`;
        const style = targetStyle[item.type];
        const { target } = item;
        return (
          <li key={key} className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Atom.Pill tone="neutral" icon={style.icon}>
                {style.label}
              </Atom.Pill>
              {Object.entries(item.reasons).map(([reason, count]) => (
                <Atom.Pill key={reason} tone="danger" icon={<Flag size={12} />}>
                  {reasonLabel(reason)}
                  {count > 1 ? ` × ${count}` : ""}
                </Atom.Pill>
              ))}
              <span className="ml-auto text-xs text-muted">
                Reported {item.count === 1 ? "once" : `${item.count} times`} · {timeAgo(item.lastReportedAt)}
              </span>
            </div>
            {target ? (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">{target.title}</span>
                {target.excerpt && (
                  <p className="line-clamp-4 rounded-md bg-rail px-3 py-2 text-sm whitespace-pre-wrap">
                    {target.excerpt}
                  </p>
                )}
                {target.author && (
                  <span className="flex items-center gap-2 text-xs text-muted">
                    <Atom.Avatar
                      size="xs"
                      label={displayName(target.author)}
                      src={target.author.avatarUrl}
                      seed={target.author.id}
                    />
                    {item.type === "community" ? "Owned by" : item.type === "user" ? "" : "By"}{" "}
                    <Molecule.UserLink username={target.author.username} className="text-foreground">
                      {displayName(target.author)}
                    </Molecule.UserLink>
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">This has been deleted.</p>
            )}
            <ul className="flex flex-col gap-2 border-t border-divider pt-4">
              {item.reports.map((report) => (
                <li key={report.id} className="flex gap-2.5 text-xs">
                  <Atom.Avatar
                    size="xs"
                    label={displayName(report.reporter)}
                    src={report.reporter.avatarUrl}
                    seed={report.reporter.id}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span>
                      <span className="font-semibold">{displayName(report.reporter)}</span>{" "}
                      <span className="text-muted">
                        · {reasonLabel(report.reason)} · {timeAgo(report.createdAt)}
                      </span>
                    </span>
                    {report.details && <p className="text-sm whitespace-pre-wrap">{report.details}</p>}
                  </div>
                </li>
              ))}
              {item.count > item.reports.length && (
                <li className="text-xs text-muted">and {item.count - item.reports.length} more</li>
              )}
            </ul>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {target && (
                <Atom.ButtonLink href={target.link} size="small" variant="secondary" className="mr-auto">
                  Open
                </Atom.ButtonLink>
              )}
              <Atom.Button
                size="small"
                variant="secondary"
                loading={pending === `${key}-dismissed`}
                disabled={pending !== null}
                onClick={() => resolve(item, "dismissed")}
              >
                Dismiss
              </Atom.Button>
              <Atom.Button
                size="small"
                loading={pending === `${key}-resolved`}
                disabled={pending !== null}
                onClick={() => resolve(item, "resolved")}
              >
                Resolve
              </Atom.Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
