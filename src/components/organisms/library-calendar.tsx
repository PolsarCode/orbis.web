"use client";

import { CalendarDays, CalendarX, ChevronLeft, ChevronRight, List } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { getLibraryCalendar, type CalendarGame, type LibraryCalendar } from "@/lib/api";
import { mediaPath, shortDate } from "@/lib/library";
import { useAuthStore } from "@/stores/auth-store";
import { useLibraryPreferencesStore, type CalendarView } from "@/stores/library-preferences-store";
import { MediaCover } from "./library-view";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_CHIPS = 3;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const calendarViews = [
  { value: "month", label: "Month", icon: <CalendarDays size={16} /> },
  { value: "week", label: "Week", icon: <List size={16} /> },
] as const;

type CalendarItem = {
  key: string;
  href: string;
  title: string;
  coverImage: string | null;
  label: string;
  sortsAt: number;
};

const pad = (value: number) => String(value).padStart(2, "0");
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

function startOfWeek(date: Date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function monthDays(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
  const days: Date[] = [];
  for (let day = startOfWeek(first); day <= last || days.length % 7 !== 0; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

function visibleDays(view: CalendarView, cursor: Date) {
  if (view === "month") return monthDays(cursor);
  const start = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function periodTitle(view: CalendarView, cursor: Date) {
  if (view === "month") {
    return cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }
  const start = startOfWeek(cursor);
  const end = addDays(start, 6);
  const day = { month: "short", day: "numeric" } as const;
  return `${start.toLocaleDateString(undefined, day)} – ${end.toLocaleDateString(undefined, {
    ...day,
    year: "numeric",
  })}`;
}

function gameItem(game: CalendarGame, label: string, sortsAt: number): CalendarItem {
  return {
    key: `game-${game.entryId}`,
    href: mediaPath("game", game.sourceId),
    title: game.title,
    coverImage: game.coverImage,
    label,
    sortsAt,
  };
}

function itemsByDay(calendars: LibraryCalendar[], games: CalendarGame[]) {
  const days = new Map<string, CalendarItem[]>();
  const add = (key: string, item: CalendarItem) => days.set(key, [...(days.get(key) ?? []), item]);
  const seen = new Set<string>();

  for (const calendar of calendars) {
    for (const episode of calendar.episodes) {
      const key = `${episode.entryId}-${episode.episode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const airsAt = new Date(episode.airsAt);
      add(dayKey(airsAt), {
        key: `episode-${key}`,
        href: mediaPath("anime", episode.sourceId),
        title: episode.title,
        coverImage: episode.coverImage,
        label: `Ep ${episode.episode} · ${airsAt.toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}`,
        sortsAt: airsAt.getTime(),
      });
    }
  }

  for (const game of games) {
    if (game.precision !== "day" || !game.releaseDate) continue;
    const date = new Date(game.releaseDate);
    const key = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    add(key, gameItem(game, "Release", date.getTime()));
  }

  for (const items of days.values()) items.sort((a, b) => a.sortsAt - b.sortsAt);
  return days;
}

function CalendarChip({ item, compact = false }: { item: CalendarItem; compact?: boolean }) {
  return (
    <Link
      href={item.href}
      title={`${item.title} · ${item.label}`}
      className="focus-ring flex min-w-0 items-center gap-1.5 rounded-md p-0.5 hover:bg-rail-item"
    >
      <MediaCover src={item.coverImage} className={compact ? "w-5" : "w-10"} />
      <span className={`min-w-0 flex-col ${compact ? "hidden lg:flex" : "flex"}`}>
        <span className={`truncate font-semibold ${compact ? "text-[11px]" : "text-sm"}`}>
          {item.title}
        </span>
        <span className={`truncate text-muted ${compact ? "text-[10px]" : "text-xs"}`}>
          {item.label}
        </span>
      </span>
    </Link>
  );
}

function MonthGrid({
  cursor,
  days,
  items,
  today,
  onShowDay,
}: {
  cursor: Date;
  days: Date[];
  items: Map<string, CalendarItem[]>;
  today: string;
  onShowDay: (day: Date) => void;
}) {
  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-divider bg-surface">
      {WEEKDAYS.map((weekday) => (
        <div
          key={weekday}
          className="border-b border-divider px-1 py-1.5 text-center text-[11px] font-semibold text-muted uppercase"
        >
          {weekday}
        </div>
      ))}
      {days.map((day) => {
        const key = dayKey(day);
        const found = items.get(key) ?? [];
        const outside = day.getMonth() !== cursor.getMonth();
        return (
          <div
            key={key}
            className={`flex min-h-20 min-w-0 flex-col gap-1 border-b border-l border-divider p-1 sm:min-h-28 [&:nth-child(7n+1)]:border-l-0 ${
              outside ? "bg-background/60 text-muted" : ""
            }`}
          >
            <span
              className={`flex size-6 items-center justify-center self-end rounded-full text-xs ${
                key === today ? "bg-accent font-bold text-white" : ""
              }`}
            >
              {day.getDate()}
            </span>
            {found.slice(0, MONTH_CHIPS).map((item) => (
              <CalendarChip key={item.key} item={item} compact />
            ))}
            {found.length > MONTH_CHIPS && (
              <button
                type="button"
                onClick={() => onShowDay(day)}
                className="focus-ring w-fit cursor-pointer rounded-sm px-0.5 text-[11px] font-semibold text-muted hover:text-foreground"
              >
                +{found.length - MONTH_CHIPS}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeekAgenda({
  days,
  items,
  today,
}: {
  days: Date[];
  items: Map<string, CalendarItem[]>;
  today: string;
}) {
  return (
    <ol className="flex flex-col divide-y divide-divider rounded-lg border border-divider bg-surface">
      {days.map((day) => {
        const key = dayKey(day);
        const found = items.get(key) ?? [];
        return (
          <li key={key} className="flex gap-4 px-4 py-3">
            <div className="flex w-12 shrink-0 flex-col items-center">
              <span className="text-[11px] font-semibold text-muted uppercase">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={`flex size-8 items-center justify-center rounded-full font-display text-lg font-bold ${
                  key === today ? "bg-accent text-white" : ""
                }`}
              >
                {day.getDate()}
              </span>
            </div>
            {found.length === 0 ? (
              <p className="self-center text-sm text-muted">Nothing this day.</p>
            ) : (
              <ul className="flex min-w-0 flex-1 flex-col gap-2">
                {found.map((item) => (
                  <li key={item.key}>
                    <CalendarChip item={item} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function GameList({ title, games }: { title: string; games: CalendarGame[] }) {
  if (games.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold text-muted uppercase">{title}</h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {games.map((game) => (
          <li key={game.entryId}>
            <CalendarChip
              item={gameItem(
                game,
                game.releaseDate && game.precision
                  ? shortDate({ date: new Date(game.releaseDate), precision: game.precision })
                  : "Date not announced",
                0,
              )}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LibraryCalendar() {
  const view = useLibraryPreferencesStore((state) => state.calendarView);
  const setView = useLibraryPreferencesStore((state) => state.setCalendarView);
  const [today] = useState(() => new Date());
  const [cursor, setCursor] = useState(today);
  const [calendars, setCalendars] = useState<Record<string, LibraryCalendar | "failed">>({});
  const [attempt, setAttempt] = useState(0);
  const days = visibleDays(view, cursor);
  const months = [...new Set((view === "month" ? [cursor] : days).map(monthKey))];
  const loaded = months.map((month) => calendars[month]);
  const failed = loaded.includes("failed");
  const ready = loaded.every((calendar) => calendar && calendar !== "failed");
  const shown = loaded.filter((calendar): calendar is LibraryCalendar => Boolean(calendar) && calendar !== "failed");
  const games = shown[0]?.games ?? [];
  const items = itemsByDay(shown, games);
  const shownMonth = view === "month" ? monthKey(cursor) : null;
  const monthGames = games.filter(
    (game) =>
      game.precision === "month" &&
      game.releaseDate &&
      game.releaseDate.slice(0, 7) === (shownMonth ?? monthKey(startOfWeek(cursor))),
  );
  const laterGames = games.filter(
    (game) => !game.releaseDate || !game.precision || game.precision === "quarter" || game.precision === "year",
  );
  const empty =
    ready && items.size === 0 && monthGames.length === 0 && laterGames.length === 0;
  const missing = months.filter((month) => !calendars[month]).join(",");

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token || !missing) return;
    let active = true;
    for (const month of missing.split(",")) {
      getLibraryCalendar(token, month)
        .then((calendar) => active && setCalendars((current) => ({ ...current, [month]: calendar })))
        .catch(() => active && setCalendars((current) => ({ ...current, [month]: "failed" })));
    }
    return () => {
      active = false;
    };
  }, [missing, attempt]);

  function move(step: number) {
    setCursor((current) =>
      view === "month"
        ? new Date(current.getFullYear(), current.getMonth() + step, 1)
        : new Date(current.getTime() + step * 7 * DAY_MS),
    );
  }

  function retry() {
    setCalendars((current) =>
      Object.fromEntries(Object.entries(current).filter(([, calendar]) => calendar !== "failed")),
    );
    setAttempt((count) => count + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Atom.Button
          variant="secondary"
          shape="circle"
          aria-label={view === "month" ? "Previous month" : "Previous week"}
          icon={<ChevronLeft size={16} />}
          onClick={() => move(-1)}
        />
        <Atom.Button
          variant="secondary"
          shape="circle"
          aria-label={view === "month" ? "Next month" : "Next week"}
          icon={<ChevronRight size={16} />}
          onClick={() => move(1)}
        />
        <h2 className="ml-1 min-w-0 flex-1 truncate font-display text-lg font-bold sm:text-xl">
          {periodTitle(view, cursor)}
        </h2>
        <Atom.Button variant="secondary" size="small" onClick={() => setCursor(today)}>
          Today
        </Atom.Button>
        <Molecule.ViewToggle label="Calendar view" options={calendarViews} view={view} onChange={setView} />
      </div>
      {failed ? (
        <Molecule.RetryAlert onRetry={retry}>Your calendar isn’t available right now.</Molecule.RetryAlert>
      ) : !ready ? (
        <div className="flex justify-center py-16">
          <Atom.Loader />
        </div>
      ) : empty ? (
        <Molecule.FeedState
          icon={<CalendarX size={24} strokeWidth={1.5} />}
          title="Nothing on your calendar."
          description="Episodes of the anime you’re watching and release dates of the games you plan to play show up here."
          action={<Atom.ButtonLink href="/library?tab=mine">Go to My library</Atom.ButtonLink>}
        />
      ) : (
        <>
          {view === "month" ? (
            <MonthGrid
              cursor={cursor}
              days={days}
              items={items}
              today={dayKey(today)}
              onShowDay={(day) => {
                setCursor(day);
                setView("week");
              }}
            />
          ) : (
            <WeekAgenda days={days} items={items} today={dayKey(today)} />
          )}
          <GameList title="Sometime this month" games={monthGames} />
          <GameList title="Coming later" games={laterGames} />
        </>
      )}
    </div>
  );
}
