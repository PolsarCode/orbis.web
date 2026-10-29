"use client";

import {
  Building2,
  FileText,
  MessageCircle,
  Users,
  type LucideIcon,
} from "lucide-react";
import { LandingReveal } from "./landing-reveal";
import { useEffect, useState } from "react";
import { getStats, type Stats } from "@/lib/api";

const DURATION = 1200;

const labels: { key: keyof Stats; label: string; icon: LucideIcon }[] = [
  { key: "members", label: "Members", icon: Users },
  { key: "communities", label: "Communities", icon: Building2 },
  { key: "posts", label: "Posts", icon: FileText },
  { key: "comments", label: "Comments", icon: MessageCircle },
];

function CountUp({ value }: { value: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setCurrent(value));
      return () => cancelAnimationFrame(frame);
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / DURATION, 1);
      setCurrent(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{current.toLocaleString()}</>;
}

export function SiteStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch(() => setFailed(true));
  }, []);

  return (
    <LandingReveal>
      <section
        id="statistics"
        aria-label="Orbis in numbers"
        className="relative overflow-hidden rounded-2xl border border-divider bg-surface p-6 sm:p-9"
      >
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">
              A growing home for fandoms
            </p>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Orbis in numbers.
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            People, communities, and conversations across Orbis.
          </p>
        </div>
        {stats ? (
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {labels.map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className="flex min-w-0 flex-col gap-4 rounded-xl border border-divider/60 bg-background/60 p-4 sm:p-5"
              >
                <dt className="flex items-center gap-2 text-xs font-medium text-muted">
                  <Icon
                    size={15}
                    className="shrink-0 text-accent"
                    aria-hidden
                  />
                  {label}
                </dt>
                <dd className="font-display text-4xl leading-none font-bold tracking-tight text-accent tabular-nums sm:text-5xl">
                  <CountUp value={stats[key]} />
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p role="status" className="text-sm text-muted">
            {failed
              ? "Statistics are unavailable right now."
              : "Loading statistics…"}
          </p>
        )}
      </section>
    </LandingReveal>
  );
}
