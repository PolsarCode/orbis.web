"use client";

import { Progress, Tour, type TourProps } from "antd";
import { Check, Compass, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import type { OnboardingStep } from "@/lib/api";
import { useOnboardingStore } from "@/stores/onboarding-store";

type TourStop = {
  target: string;
  title: string;
  description: string;
  placement: NonNullable<TourProps["placement"]>;
};

export const tourStops: TourStop[] = [
  {
    target: "home",
    placement: "right",
    title: "Your home feed",
    description:
      "Posts and threads from every community you’re in, newest first. Click anyone’s name or picture to see their profile.",
  },
  {
    target: "library",
    placement: "right",
    title: "Your library",
    description:
      "Track the anime, manga, and games you’re watching, reading, and playing. Open any title to read more, and public updates show up in your communities’ feeds.",
  },
  {
    target: "communities",
    placement: "right",
    title: "Your communities",
    description:
      "Every community you’ve joined lives in this rail. Drag them to reorder, drop one onto another to make a folder, and click one to open its feed, threads, and members.",
  },
  {
    target: "create",
    placement: "right",
    title: "Start a community",
    description:
      "Make your own space, public or private. As the owner you can set its icon, cover, and background right on its page. New accounts can start one after their first day.",
  },
  {
    target: "explore",
    placement: "right",
    title: "Explore",
    description: "Search public communities and join the ones you like.",
  },
  {
    target: "composer",
    placement: "bottom",
    title: "Share something",
    description:
      "Write a post for your wall, or pick one of your communities to share it there. Use the Threads tab inside a community for longer discussions with votes.",
  },
  {
    target: "feed-filters",
    placement: "bottom",
    title: "Choose your feed",
    description: "Switch between Card and Compact view, and show or hide posts, threads, and library updates. Your choices are remembered across feeds on this browser.",
  },
  {
    target: "friend-requests",
    placement: "bottom",
    title: "Friend requests",
    description: "People who want to be your friend show up here. The number shows how many are waiting.",
  },
  {
    target: "messages",
    placement: "bottom",
    title: "Messages",
    description:
      "Chat one-on-one or in groups of up to 20. New messages pop up in the corner, and messages from people who aren’t your friends wait in Requests.",
  },
  {
    target: "search",
    placement: "bottom",
    title: "Search everything",
    description:
      "Find people, communities, anime, manga, games, and posts in one place. Open it from any page, or press Ctrl K (⌘K on a Mac).",
  },
  {
    target: "side-panel",
    placement: "left",
    title: "Friends",
    description:
      "See which friends are online. Inside a community, this panel shows who’s online there.",
  },
  {
    target: "notifications",
    placement: "rightBottom",
    title: "Notifications",
    description:
      "Comments on your posts, replies, friend requests, and report updates all land here, and new ones pop up in the corner for a few seconds. Search and filter them on the notifications page.",
  },
  {
    target: "account",
    placement: "rightBottom",
    title: "Your account",
    description:
      "Switch between light and dark, appear offline, open your profile to change your picture, cover, and wallpaper, or log out.",
  },
  {
    target: "library-dock",
    placement: "top",
    title: "Your library",
    description:
      "Pull this up from the bottom of any page to check your library and update what you’re watching, reading, or playing.",
  },
  {
    target: "feedback",
    placement: "leftBottom",
    title: "Send feedback",
    description:
      "Found a bug or have an idea? Send it from here and you’ll get a ticket number to track it.",
  },
  {
    target: "reports",
    placement: "leftBottom",
    title: "Your reports",
    description:
      "See everything you’ve reported and its status. You’re notified whenever a report moves.",
  },
];

type ChecklistItem = {
  key: OnboardingStep | "tour";
  title: string;
  hint: ReactNode;
};

export const checklistItems: ChecklistItem[] = [
  { key: "tour", title: "Take the tour", hint: "A quick look at everything Orbis can do." },
  {
    key: "avatar",
    title: "Add a profile picture",
    hint: (
      <>
        Click your picture on <ChecklistLink href="/profile">your profile</ChecklistLink>.
      </>
    ),
  },
  {
    key: "community",
    title: "Join or create a community",
    hint: (
      <>
        Find one in <ChecklistLink href="/explore">Explore</ChecklistLink>, or press + in the rail.
      </>
    ),
  },
  { key: "post", title: "Share your first post", hint: "Use the box below or a community’s Threads tab." },
  { key: "comment", title: "Join a discussion", hint: "Open any post or thread and leave a comment." },
  {
    key: "friend",
    title: "Add a friend",
    hint: "Use the search at the top to find someone, then connect.",
  },
  {
    key: "library",
    title: "Add something to your library",
    hint: (
      <>
        Search your favourites in the <ChecklistLink href="/library">Library</ChecklistLink>.
      </>
    ),
  },
  {
    key: "feedback",
    title: "Send feedback",
    hint: "Use the button in the bottom-right corner. You’ll get a ticket number.",
  },
];

function ChecklistLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="focus-ring rounded-sm font-semibold text-accent hover:underline">
      {children}
    </Link>
  );
}

function visibleTarget(name: string) {
  const element = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
  if (!element) return null;
  const { width, height, left, right } = element.getBoundingClientRect();
  return width > 0 && height > 0 && right > 0 && left < window.innerWidth ? element : null;
}

function scrollParent(element: HTMLElement) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
  }
  return null;
}

function visiblePart(element: HTMLElement) {
  const parent = scrollParent(element);
  if (!parent) return element;

  const rect = element.getBoundingClientRect();
  const bounds = parent.getBoundingClientRect();
  const top = Math.max(rect.top, bounds.top);
  const bottom = Math.min(rect.bottom, bounds.bottom);
  if (top <= rect.top && bottom >= rect.bottom) return element;

  let proxy = document.getElementById("tour-visible-part");
  if (!proxy) {
    proxy = document.createElement("div");
    proxy.id = "tour-visible-part";
    proxy.setAttribute("aria-hidden", "true");
    proxy.style.cssText = "position:fixed;pointer-events:none;visibility:hidden";
    document.body.appendChild(proxy);
  }
  Object.assign(proxy.style, {
    left: `${rect.left}px`,
    top: `${top}px`,
    width: `${rect.width}px`,
    height: `${Math.max(0, bottom - top)}px`,
  });
  return proxy;
}

function revealed(element: HTMLElement) {
  element.scrollIntoView({ block: "nearest", inline: "nearest" });
  return visiblePart(element);
}

function GuidedTour({
  stops,
  open,
  run,
  onEnd,
}: {
  stops: TourStop[];
  open: boolean;
  run: number;
  onEnd: () => void;
}) {
  function endTour() {
    document.getElementById("tour-visible-part")?.remove();
    onEnd();
  }

  const steps = useMemo<NonNullable<TourProps["steps"]>>(
    () =>
      open && run > 0
        ? stops.flatMap(({ target, title, description, placement }) => {
            const element = visibleTarget(target);
            return element
              ? [{ title, description, placement, target: () => revealed(element) }]
              : [];
          })
        : [],
    [open, run, stops],
  );

  return (
    <Tour
      key={run}
      open={open && steps.length > 0}
      steps={steps}
      arrow={false}
      gap={{ radius: 12, offset: 0 }}
      onClose={endTour}
      onFinish={endTour}
      indicatorsRender={(index, total) => (
        <span className="text-xs text-muted">
          {index + 1} / {total}
        </span>
      )}
    />
  );
}

export function OnboardingTour() {
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const open = useOnboardingStore((state) => state.tourOpen);
  const startTour = useOnboardingStore((state) => state.startTour);
  const finishTour = useOnboardingStore((state) => state.finishTour);
  const run = useOnboardingStore((state) => state.tourRun);
  const [autoStarted, setAutoStarted] = useState(false);

  useEffect(() => {
    if (!onboarding || onboarding.tourCompleted || autoStarted) return;
    const timer = setTimeout(() => {
      setAutoStarted(true);
      startTour();
    }, 800);
    return () => clearTimeout(timer);
  }, [onboarding, autoStarted, startTour]);

  return <GuidedTour stops={tourStops} open={open} run={run} onEnd={finishTour} />;
}

export const pageTours = {
  community: [
    {
      target: "community-tabs",
      placement: "bottom",
      title: "Posts and threads",
      description:
        "Turn on Thread to start a longer discussion with a title and votes. Under the composer, All shows everything, and Hot, New, and Top show just threads.",
    },
    {
      target: "community-composer",
      placement: "bottom",
      title: "Post to this community",
      description: "Share something with everyone in the community.",
    },
    {
      target: "invite",
      placement: "left",
      title: "Invite",
      description: "Make an invite link to bring friends in. You can set when it expires and how many times it works.",
    },
    {
      target: "invite-card",
      placement: "bottom",
      title: "Invite Card",
      description: "Print a card with the community’s pictures and a permanent QR code that opens it when scanned.",
    },
    {
      target: "community-settings",
      placement: "bottom",
      title: "Community settings",
      description: "Change the name, description, pictures and admins, or make the community public or private.",
    },
  ],
  profile: [
    {
      target: "profile-tabs",
      placement: "bottom",
      title: "Posts, library, friends",
      description: "See someone’s wall, what they’re watching and reading, their friends, and their communities.",
    },
    {
      target: "profile-wall",
      placement: "bottom",
      title: "Write on the wall",
      description: "Post on your own wall, or on a friend’s.",
    },
    {
      target: "side-panel",
      placement: "left",
      title: "Friends",
      description: "Their friends, with who’s online right now.",
    },
  ],
  library: [
    {
      target: "search",
      placement: "bottom",
      title: "Add anime, manga, and games",
      description: "Search for a title and add it to your library. On this page, titles show up first.",
    },
    {
      target: "library-tabs",
      placement: "bottom",
      title: "Your shelves",
      description: "Filter by what you’re watching, finished, paused, dropped, or planning.",
    },
    {
      target: "library-view",
      placement: "bottomRight",
      title: "Type and view",
      description: "Show only anime, manga, or games, and switch between cards and a list.",
    },
  ],
  media: [
    {
      target: "media-library",
      placement: "bottom",
      title: "Track it",
      description: "Add the title to your library and update your status and progress here.",
    },
    {
      target: "media-wall",
      placement: "top",
      title: "Talk about it",
      description: "Share your thoughts with everyone else who’s into this title.",
    },
  ],
  explore: [
    {
      target: "search",
      placement: "bottom",
      title: "Search communities",
      description: "Find public communities by name and join them right from the results.",
    },
    {
      target: "explore-communities",
      placement: "top",
      title: "Popular communities",
      description: "Hover over a community to see what it’s about, who’s in it, and which friends are there.",
    },
  ],
  reports: [
    {
      target: "search",
      placement: "bottom",
      title: "Search tickets",
      description:
        "Find a ticket by its number, message, or who sent it. On this page, tickets show up first, and on the Reported tab you can search reported content too.",
    },
    {
      target: "reports-tabs",
      placement: "bottom",
      title: "Board, hidden, reported",
      description:
        "Track feedback on the board, find hidden reports, and review content people reported as spam or abuse.",
    },
    {
      target: "reports-filters",
      placement: "bottomRight",
      title: "Filters",
      description: "Show reports assigned to you or someone else, or only bugs, ideas, or other feedback.",
    },
    {
      target: "reports-discord",
      placement: "bottomRight",
      title: "Discord",
      description: "Post new reports and activity to a Discord channel.",
    },
  ],
} satisfies Record<string, TourStop[]>;

export function PageTour({ name }: { name: keyof typeof pageTours }) {
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const fetchOnboarding = useOnboardingStore((state) => state.fetchOnboarding);
  const completeTour = useOnboardingStore((state) => state.completeTour);
  const [run, setRun] = useState(0);
  const pending =
    onboarding !== null && onboarding.tourCompleted && !onboarding.completedTours.includes(name);

  useEffect(() => {
    if (!onboarding) fetchOnboarding();
  }, [onboarding, fetchOnboarding]);

  useEffect(() => {
    if (!pending || run > 0) return;
    const timer = setTimeout(() => setRun(1), 1000);
    return () => clearTimeout(timer);
  }, [pending, run]);

  return (
    <GuidedTour
      stops={pageTours[name]}
      open={pending && run > 0}
      run={run}
      onEnd={() => completeTour(name)}
    />
  );
}

export function OnboardingChecklist() {
  const onboarding = useOnboardingStore((state) => state.onboarding);
  const fetchOnboarding = useOnboardingStore((state) => state.fetchOnboarding);
  const startTour = useOnboardingStore((state) => state.startTour);
  const setChecklistDismissed = useOnboardingStore(
    (state) => state.setChecklistDismissed,
  );

  useEffect(() => {
    fetchOnboarding();
    window.addEventListener("focus", fetchOnboarding);
    return () => window.removeEventListener("focus", fetchOnboarding);
  }, [fetchOnboarding]);

  if (!onboarding || onboarding.checklistDismissed) return null;

  const done = (key: ChecklistItem["key"]) =>
    key === "tour" ? onboarding.tourCompleted : onboarding.steps[key];
  const completed = checklistItems.filter(({ key }) => done(key)).length;
  const finished = completed === checklistItems.length;

  return (
    <section
      aria-label="Get started checklist"
      className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold text-accent uppercase">Get started</p>
          <h2 className="font-display text-2xl leading-tight font-bold">
            {finished ? "You’re all set." : "Make yourself at home."}
          </h2>
          <p className="text-xs text-muted">
            {completed} of {checklistItems.length} done
          </p>
        </div>
        <button
          type="button"
          aria-label="Hide checklist"
          title="Hide checklist"
          onClick={() => setChecklistDismissed(true)}
          className="icon-button cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>
      <Progress
        percent={Math.round((completed / checklistItems.length) * 100)}
        showInfo={false}
        size="small"
        strokeColor="var(--accent)"
        railColor="var(--rail-item)"
      />
      <ul className="flex flex-col gap-1">
        {checklistItems.map((item) => {
          const checked = done(item.key);
          return (
            <li key={item.key} className="flex items-start gap-3 rounded-md py-2">
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  checked
                    ? "border-online bg-online text-white"
                    : "border-divider bg-background"
                }`}
              >
                {checked && <Check size={12} strokeWidth={3} />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={`text-sm font-semibold ${checked ? "text-muted line-through" : ""}`}
                >
                  <span className="sr-only">{checked ? "Done: " : "To do: "}</span>
                  {item.title}
                </span>
                {!checked && <span className="text-xs text-muted">{item.hint}</span>}
              </div>
              {item.key === "tour" && (
                <Atom.Button
                  size="small"
                  variant={checked ? "secondary" : "primary"}
                  icon={<Compass size={14} />}
                  onClick={startTour}
                >
                  {checked ? "Replay" : "Start tour"}
                </Atom.Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
