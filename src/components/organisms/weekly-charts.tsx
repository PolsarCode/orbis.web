"use client";

import { ArrowDown, ArrowUp, CalendarX, ChevronLeft, ChevronRight, Download, Minus } from "lucide-react";
import { App, Tooltip } from "antd";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { getChart, type Chart, type ChartEntry, type ChartMovement, type MediaType } from "@/lib/api";
import { countLabel, libraryPath, mediaPath, mediaTypeParam } from "@/lib/library";
import { saveFile } from "@/lib/save-file";
import { weekRange } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { useAuthStore } from "@/stores/auth-store";
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

function movementLabel({ movement, previousRank }: ChartEntry) {
  if (movement === "new") return "New this week";
  if (movement === "same") return "Same as last week";
  return `${movement === "up" ? "Up" : "Down"} from ${previousRank}`;
}

function ChartRow({ entry }: { entry: ChartEntry }) {
  const { media } = entry;
  const href = mediaPath(media.type, media.sourceId);

  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-5">
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
      <Link href={href} tabIndex={-1} aria-hidden className="focus-ring rounded-md">
        <MediaCover src={media.coverImage} className="w-10 sm:w-12" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={href}
          className="focus-ring truncate rounded-sm text-sm font-semibold hover:underline"
        >
          {media.title}
        </Link>
        <span className="truncate text-xs text-muted">{countLabel(media)}</span>
      </div>
    </li>
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

function ChartView({ chart, type, now }: { chart: Chart; type: MediaType; now: number }) {
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
        <DownloadButton chart={chart} type={type} />
      </div>
      {chart.entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Nothing’s on this chart yet.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-divider rounded-lg border border-divider bg-surface">
          {chart.entries.map((entry) => (
            <ChartRow key={entry.media.id} entry={entry} />
          ))}
        </ol>
      )}
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
        <ChartView chart={current.chart} type={type} now={now} />
      )}
    </div>
  );
}
