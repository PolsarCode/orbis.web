"use client";

import {
  ArrowDown,
  ArrowUp,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  MessageCircle,
  Minus,
} from "lucide-react";
import { App, Tooltip } from "antd";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  getChart,
  getChartDiscussion,
  type Chart,
  type ChartDiscussion as Discussion,
  type ChartEntry,
  type ChartMovement,
  type MediaType,
} from "@/lib/api";
import { countLabel, libraryPath, mediaPath, mediaTypeParam } from "@/lib/library";
import { saveFile } from "@/lib/save-file";
import { weekRange } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { useAuthStore } from "@/stores/auth-store";
import { CommentSection } from "./comment-section";
import { MediaCover } from "./library-view";

const movementIcons: Record<ChartMovement, ReactNode> = {
  up: <ArrowUp size={16} className="text-online" />,
  down: <ArrowDown size={16} className="text-danger" />,
  same: <Minus size={16} className="text-muted" />,
  new: (
    <Atom.Pill tone="accent" size="xs">
      NEW
    </Atom.Pill>
  ),
};

type Loaded = { key: string; chart: Chart | null; failed?: boolean };

type LoadedDiscussion = { attempt: number; discussion: Discussion | null; failed?: boolean };

const CHART_SIZE = 10;
const medalTones = ["text-amber-300", "text-zinc-200", "text-orange-300"];

function movementLabel({ movement, previousRank }: ChartEntry) {
  if (movement === "new") return "New this week";
  if (movement === "same") return "Same as last week";
  return `${movement === "up" ? "Up" : "Down"} from ${previousRank}`;
}

function ChartRow({ entry }: { entry: ChartEntry }) {
  const { media } = entry;

  return (
    <li>
      <Link
        href={mediaPath(media.type, media.sourceId)}
        className="focus-ring flex items-center gap-3 px-3 py-3 transition-colors hover:bg-rail-item/60 focus-visible:bg-rail-item/60 sm:gap-4 sm:px-5"
      >
        <span className="w-7 shrink-0 text-center font-display text-xl font-bold tabular-nums sm:w-8 sm:text-2xl">
          {entry.rank}
        </span>
        <span
          role="img"
          aria-label={movementLabel(entry)}
          className="flex w-9 shrink-0 justify-center"
        >
          {movementIcons[entry.movement]}
        </span>
        <MediaCover src={media.coverImage} className="w-10 sm:w-12" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-semibold">{media.title}</span>
          <span className="truncate text-xs text-muted">{countLabel(media)}</span>
        </span>
      </Link>
    </li>
  );
}

function TopEntry({ entry, featured = false }: { entry: ChartEntry; featured?: boolean }) {
  const { media } = entry;
  const backdrop = media.bannerImage ?? media.coverImage;

  return (
    <Link
      href={mediaPath(media.type, media.sourceId)}
      className={`group focus-ring relative isolate flex overflow-hidden rounded-lg border border-divider bg-rail ${
        featured ? "h-52 sm:col-span-2 sm:h-60" : "h-40"
      }`}
    >
      {backdrop && (
        <Image
          src={backdrop}
          alt=""
          fill
          unoptimized
          sizes={featured ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 640px) 25vw, 100vw"}
          className={`-z-10 object-cover transition-transform duration-500 motion-reduce:transition-none ${
            media.bannerImage ? "group-hover:scale-105" : "scale-125 blur-2xl"
          }`}
        />
      )}
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/55 to-black/15" />
      <span className="flex w-full items-end gap-4 p-4 text-white sm:p-5">
        <MediaCover
          src={media.coverImage}
          className={`shadow-lg ${featured ? "w-20 sm:w-24" : "w-14"}`}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1 font-display leading-none font-extrabold ${
                medalTones[entry.rank - 1] ?? ""
              } ${featured ? "text-4xl" : "text-3xl"}`}
            >
              {entry.rank === 1 && <Crown size={featured ? 26 : 20} aria-hidden />}#{entry.rank}
            </span>
            <span role="img" aria-label={movementLabel(entry)} className="flex items-center">
              {movementIcons[entry.movement]}
            </span>
          </span>
          <span
            className={`line-clamp-2 font-display leading-tight font-bold ${
              featured ? "text-2xl sm:text-3xl" : "text-lg"
            }`}
          >
            {media.title}
          </span>
          <span className="truncate text-xs text-white/75">{countLabel(media)}</span>
        </span>
      </span>
    </Link>
  );
}

function WeekButton({ href, label, icon }: { href: string | null; label: string; icon: ReactNode }) {
  return href ? (
    <Atom.ButtonLink href={href} variant="secondary" shape="circle" aria-label={label} icon={icon} />
  ) : (
    <Atom.Button variant="secondary" shape="circle" aria-label={label} icon={icon} disabled />
  );
}

function DownloadButton({ chart, type }: { chart: Chart; type: MediaType }) {
  const { message } = App.useApp();
  const [pending, setPending] = useState(false);

  async function download() {
    setPending(true);
    try {
      const res = await fetch(`/charts/${type}/image?week=${chart.week}`);
      if (!res.ok) throw new Error();
      saveFile(await res.blob(), `orbis-${type}-chart-${chart.startsAt.slice(0, 10)}.png`);
    } catch {
      message.error("Couldn’t create the image. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Tooltip title="Download image">
      <Atom.Button
        variant="secondary"
        aria-label="Download image"
        icon={<Download size={16} />}
        loading={pending}
        onClick={download}
      />
    </Tooltip>
  );
}

function useChartDiscussion(type: MediaType, week: string) {
  const [loaded, setLoaded] = useState<LoadedDiscussion | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = loaded?.attempt === attempt ? loaded : null;

  useEffect(() => {
    let ignore = false;
    getChartDiscussion(useAuthStore.getState().token, type, week)
      .then((discussion) => {
        if (!ignore) setLoaded({ attempt, discussion });
      })
      .catch(() => {
        if (!ignore) setLoaded({ attempt, discussion: null, failed: true });
      });
    return () => {
      ignore = true;
    };
  }, [type, week, attempt]);

  return { current, retry: () => setAttempt((count) => count + 1) };
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function jumpToLatestComment(section: HTMLElement | null) {
  if (!section) return;
  const comments = [...section.querySelectorAll<HTMLElement>("[id^='comment-']")];
  const latest = comments.reduce<HTMLElement | null>(
    (best, comment) =>
      !best || Number(comment.id.slice(8)) > Number(best.id.slice(8)) ? comment : best,
    null,
  );
  const behavior = prefersReducedMotion() ? "auto" : "smooth";

  if (!latest) {
    section.scrollIntoView({ behavior, block: "start" });
    return;
  }
  latest.scrollIntoView({ behavior, block: "center" });
  latest.animate(
    [{ boxShadow: "0 0 0 2px var(--accent)" }, { boxShadow: "0 0 0 2px transparent" }],
    { duration: 1800, easing: "ease-out" },
  );
}

function CommentsButton({ count, onClick }: { count: number | null; onClick: () => void }) {
  const label = count === null ? "Comments" : `${count} ${count === 1 ? "comment" : "comments"}`;

  return (
    <Tooltip title="Jump to the latest comment">
      <Atom.Button
        variant="secondary"
        aria-label={`${label}, jump to the latest`}
        icon={<MessageCircle size={16} />}
        onClick={onClick}
      >
        {count !== null && (
          <>
            {count}
            <span className="max-sm:hidden">{count === 1 ? " comment" : " comments"}</span>
          </>
        )}
      </Atom.Button>
    </Tooltip>
  );
}

function ChartDiscussion({
  current,
  retry,
  sectionRef,
  onCount,
}: {
  current: LoadedDiscussion | null;
  retry: () => void;
  sectionRef: RefObject<HTMLElement | null>;
  onCount: (count: number) => void;
}) {
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const ready = Boolean(current?.discussion);

  useEffect(() => {
    if (ready && window.location.hash === "#discussion") {
      sectionRef.current?.scrollIntoView({ block: "start" });
    }
  }, [ready, sectionRef]);

  if (current && !current.failed && !current.discussion) return null;

  return (
    <section
      ref={sectionRef}
      id="discussion"
      aria-labelledby="discussion-heading"
      className="flex scroll-mt-4 flex-col gap-4 pt-2"
    >
      <h2 id="discussion-heading" className="text-xs font-semibold text-muted uppercase">
        Discussion
      </h2>
      {!current ? (
        <div className="flex py-8">
          <Atom.Loader />
        </div>
      ) : current.failed || !current.discussion ? (
        <Molecule.RetryAlert onRetry={retry}>
          This discussion isn’t available right now.
        </Molecule.RetryAlert>
      ) : (
        <CommentSection
          target={{ type: "chart", id: current.discussion.id }}
          canComment={signedIn}
          onCommentsChange={(comments) => onCount(comments.length)}
        />
      )}
    </section>
  );
}

function ChartView({ chart, type, now }: { chart: Chart; type: MediaType; now: number }) {
  const discussion = useChartDiscussion(type, chart.week);
  const [count, setCount] = useState<number | null>(null);
  const section = useRef<HTMLElement>(null);
  const comments = count ?? discussion.current?.discussion?.commentCount ?? null;
  const entries = chart.entries.slice(0, CHART_SIZE);
  const [top, rest] = [entries.slice(0, 3), entries.slice(3)];
  const current = new Date(chart.endsAt).getTime() > now;
  const next = chart.nextWeek
    ? libraryPath("charts", type, chart.nextWeek)
    : current
      ? null
      : libraryPath("charts", type);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <WeekButton
          href={chart.previousWeek && libraryPath("charts", type, chart.previousWeek)}
          label="Previous week"
          icon={<ChevronLeft size={16} />}
        />
        <WeekButton href={next} label="Next week" icon={<ChevronRight size={16} />} />
        <h2 className="ml-1 min-w-0 flex-1 truncate font-display text-lg font-bold sm:text-xl">
          {weekRange(chart.startsAt, chart.endsAt)}
        </h2>
        {discussion.current?.discussion && (
          <CommentsButton count={comments} onClick={() => jumpToLatestComment(section.current)} />
        )}
        <DownloadButton chart={chart} type={type} />
      </div>
      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nothing’s on this chart yet.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {top.map((entry, index) => (
              <TopEntry key={entry.media.id} entry={entry} featured={index === 0} />
            ))}
          </div>
          {rest.length > 0 && (
            <ol
              start={top.length + 1}
              className="flex flex-col divide-y divide-divider overflow-hidden rounded-lg border border-divider bg-surface"
            >
              {rest.map((entry) => (
                <ChartRow key={entry.media.id} entry={entry} />
              ))}
            </ol>
          )}
        </>
      )}
      <ChartDiscussion
        current={discussion.current}
        retry={discussion.retry}
        sectionRef={section}
        onCount={setCount}
      />
    </div>
  );
}

export function WeeklyCharts() {
  const params = useSearchParams();
  const type = mediaTypeParam(params.get("type"));
  const week = params.get("week") ?? undefined;
  const token = useAuthStore((state) => state.token);
  const now = useNow(false);
  const key = `${type}:${week ?? ""}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    getChart(token, type, week)
      .then((chart) => {
        if (!ignore) setLoaded({ key, chart });
      })
      .catch(() => {
        if (!ignore) setLoaded({ key, chart: null, failed: true });
      });
    return () => {
      ignore = true;
    };
  }, [key, token, type, week, attempt]);

  const current = loaded?.key === key ? loaded : null;

  function retry() {
    setLoaded(null);
    setAttempt((count) => count + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      {!current ? (
        <div className="flex justify-center py-16">
          <Atom.Loader />
        </div>
      ) : current.failed ? (
        <Molecule.RetryAlert onRetry={retry}>This chart isn’t available right now.</Molecule.RetryAlert>
      ) : !current.chart ? (
        <Molecule.FeedState
          icon={<CalendarX size={24} strokeWidth={1.5} />}
          title="No chart for this week."
          description="Charts are saved once a week, and this week doesn’t have one."
          action={
            week && (
              <Atom.ButtonLink href={libraryPath("charts", type)}>See this week’s chart</Atom.ButtonLink>
            )
          }
        />
      ) : (
        <ChartView key={`${type}:${current.chart.week}`} chart={current.chart} type={type} now={now} />
      )}
    </div>
  );
}
