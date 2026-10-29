"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { App, Input, Modal, Select, Tooltip } from "antd";
import {
  Bug,
  CircleCheck,
  CircleDashed,
  CloudOff,
  EyeOff,
  Inbox,
  Webhook,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  addReportComment,
  assignReport,
  getReport,
  getReportComments,
  getReportWebhook,
  getReports,
  setReportHidden,
  setReportWebhook,
  updateReportStatus,
  type Report,
  type PresenceStatus,
  type ReportAdmin,
  type ReportCategory,
  type ReportComment,
  type ReportWebhook,
  type ReportStatus,
} from "@/lib/api";
import { DISCORD_WEBHOOK } from "@/lib/discord";
import { displayName } from "@/lib/display-name";
import { getReporterStatusLabel } from "@/lib/report-status";
import { ticketNumber } from "@/lib/ticket";
import { timeAgo } from "@/lib/time";
import { useAuthStore } from "@/stores/auth-store";
import { useFriendsStore } from "@/stores/friends-store";
import { PersonRow } from "./person-row";
import { PanelHeading } from "./side-panel";

export const categoryStyle: Record<
  ReportCategory,
  { label: string; icon: ReactNode; tone: Atom.PillTone }
> = {
  bug: { label: "Bug", icon: <Bug size={12} />, tone: "danger" },
  idea: { label: "Idea", icon: <Lightbulb size={12} />, tone: "warning" },
  other: { label: "Other", icon: <MessageCircle size={12} />, tone: "neutral" },
};

export const columns: { status: ReportStatus; title: string; icon: ReactNode }[] = [
  { status: "todo", title: "To do", icon: <CircleDashed size={16} /> },
  { status: "in_progress", title: "In progress", icon: <LoaderCircle size={16} /> },
  { status: "done", title: "Done", icon: <CircleCheck size={16} /> },
];

export type ReportFilter = {
  assignee: "anyone" | "me" | "unassigned" | number;
  category: "all" | ReportCategory;
};

export type ReportView = "board" | "list";

export function matchesFilter(report: Report, filter: ReportFilter, myId: number | undefined) {
  const assigneeId = report.assignee?.id ?? null;
  if (filter.assignee === "me" && assigneeId !== myId) return false;
  if (filter.assignee === "unassigned" && assigneeId !== null) return false;
  if (typeof filter.assignee === "number" && assigneeId !== filter.assignee) return false;
  return filter.category === "all" || report.category === filter.category;
}

function CardMeta({ report }: { report: Report }) {
  return (
    <>
      {Boolean(report.commentCount) && (
        <span
          title={`${report.commentCount} ${report.commentCount === 1 ? "comment" : "comments"}`}
          className="flex shrink-0 items-center gap-1 text-[11px] text-muted"
        >
          <MessageSquare size={12} aria-hidden />
          {report.commentCount}
        </span>
      )}
      {report.assignee && (
        <Tooltip title={`Assigned to ${displayName(report.assignee)}`}>
          <span className="shrink-0">
            <Atom.Avatar
              size="xs"
              label={displayName(report.assignee)}
              src={report.assignee.avatarUrl}
              seed={report.assignee.id}
            />
          </span>
        </Tooltip>
      )}
    </>
  );
}

function ReportCard({
  report,
  dragging = false,
  action,
}: {
  report: Report;
  dragging?: boolean;
  action?: ReactNode;
}) {
  const category = categoryStyle[report.category];

  return (
    <article
      className={`flex flex-col gap-3 rounded-lg border border-divider bg-surface p-4 ${
        dragging ? "rotate-1 shadow-[0_16px_32px_-16px_rgb(0_0_0/0.45)]" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold text-muted">
          {ticketNumber(report.id)}
        </span>
        <Atom.Pill tone={category.tone} icon={category.icon}>
          {category.label}
        </Atom.Pill>
        <span className="ml-auto text-[11px] text-muted">
          {timeAgo(report.createdAt)}
        </span>
        {action}
      </div>
      <p className="line-clamp-5 text-sm whitespace-pre-wrap">{report.message}</p>
      {report.resolutionNote && (
        <p className="line-clamp-3 rounded-md bg-rail px-2.5 py-2 text-xs whitespace-pre-wrap text-muted">
          <span className="font-semibold text-foreground">Reply: </span>
          {report.resolutionNote}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Atom.Avatar
          size="xs"
          label={displayName(report.author)}
          src={report.author.avatarUrl}
          seed={report.author.id}
        />
        <span className="min-w-0 flex-1 truncate text-xs text-muted">
          {displayName(report.author)}
        </span>
        {report.pageUrl && (
          <Link
            href={report.pageUrl}
            prefetch={false}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            className="focus-ring max-w-28 shrink truncate rounded-sm text-[11px] text-muted hover:text-accent"
          >
            {report.pageUrl}
          </Link>
        )}
        <CardMeta report={report} />
      </div>
    </article>
  );
}

function DraggableReport({
  report,
  onHide,
  onOpen,
}: {
  report: Report;
  onHide: (report: Report) => void;
  onOpen: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: report.id,
  });

  return (
    <li
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="Report card"
      onClick={() => onOpen(report.id)}
      className={`focus-ring cursor-grab touch-none rounded-lg active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <ReportCard report={report} action={<HideButton report={report} onHide={onHide} />} />
    </li>
  );
}

function Column({
  status,
  title,
  icon,
  reports,
  onHide,
  onOpen,
}: {
  status: ReportStatus;
  title: string;
  icon: ReactNode;
  reports: Report[];
  onHide: (report: Report) => void;
  onOpen: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      aria-label={title}
      className={`flex min-h-0 w-72 shrink-0 flex-col gap-3 rounded-xl border p-3 transition-colors sm:w-auto sm:flex-1 ${
        isOver ? "border-accent bg-accent-soft" : "border-divider bg-rail"
      }`}
    >
      <h2 className="flex items-center gap-2 px-1 text-sm font-semibold">
        {icon}
        {title}
        <span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted">
          {reports.length}
        </span>
      </h2>
      <ul ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto">
        {reports.map((report) => (
          <DraggableReport key={report.id} report={report} onHide={onHide} onOpen={onOpen} />
        ))}
        {reports.length === 0 && (
          <li className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-divider p-6 text-center text-xs text-muted">
            Drop a report here
          </li>
        )}
      </ul>
    </section>
  );
}

function ReportList({
  reports,
  onOpen,
  action,
}: {
  reports: Report[];
  onOpen: (id: number) => void;
  action: (report: Report) => ReactNode;
}) {
  return (
    <ul className="flex flex-col divide-y divide-divider rounded-lg border border-divider bg-surface">
      {reports.map((report) => {
        const category = categoryStyle[report.category];
        const column = columns.find(({ status }) => status === report.status)!;
        return (
          <li
            key={report.id}
            role="button"
            tabIndex={0}
            aria-label={`Open report ${ticketNumber(report.id)}`}
            onClick={() => onOpen(report.id)}
            onKeyDown={(event) => {
              if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                onOpen(report.id);
              }
            }}
            className="focus-ring flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-rail-item/40"
          >
            <span className="w-12 shrink-0 font-mono text-[11px] font-semibold text-muted">
              {ticketNumber(report.id)}
            </span>
            <Atom.Pill tone={category.tone} icon={category.icon}>
              {category.label}
            </Atom.Pill>
            <span className="min-w-0 flex-1 basis-48 truncate text-sm">{report.message}</span>
            <span className="hidden w-28 shrink-0 truncate text-xs text-muted md:block">
              {displayName(report.author)}
            </span>
            <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted sm:flex">
              {column.icon}
              {column.title}
            </span>
            <CardMeta report={report} />
            <span className="w-16 shrink-0 text-right text-[11px] text-muted">
              {timeAgo(report.createdAt)}
            </span>
            <div
              className="flex shrink-0 items-center gap-1"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {action(report)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function NoMatches() {
  return (
    <Molecule.FeedState
      eyebrow="No matches"
      icon={<Inbox size={24} strokeWidth={1.5} />}
      title="Nothing matches your filters."
      description="Try a different assignee or type."
    />
  );
}

function HideButton({ report, onHide }: { report: Report; onHide: (report: Report) => void }) {
  return (
    <Tooltip title="Hide report">
      <button
        type="button"
        aria-label={`Hide report ${ticketNumber(report.id)}`}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onHide(report);
        }}
        className="icon-button -my-1 -mr-1.5 cursor-pointer p-1"
      >
        <EyeOff size={14} />
      </button>
    </Tooltip>
  );
}

function DoneModal({
  report,
  onCancel,
  onConfirm,
}: {
  report: Report | null;
  onCancel: () => void;
  onConfirm: (note?: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"send" | "skip" | null>(null);

  async function confirm(withNote: boolean) {
    setPending(withNote ? "send" : "skip");
    try {
      await onConfirm(withNote ? note.trim() : undefined);
      setNote("");
    } finally {
      setPending(null);
    }
  }

  const name = report ? displayName(report.author) : "";

  return (
    <Modal
      open={report !== null}
      title={null}
      footer={null}
      width={480}
      destroyOnHidden
      onCancel={() => {
        setNote("");
        onCancel();
      }}
      styles={{ container: { padding: 24 } }}
    >
      {report && (
        <div className="flex flex-col gap-6">
          <Molecule.ModalHeader
            eyebrow={`Report ${ticketNumber(report.id)}`}
            title={`Mark as ${getReporterStatusLabel("done", report.category).toLowerCase()}.`}
            description={`${name} will be notified. Add a message if you want to tell them what changed.`}
          />
          <blockquote className="flex flex-col gap-1 rounded-lg border border-divider bg-rail p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted uppercase">
              {categoryStyle[report.category].icon}
              {categoryStyle[report.category].label} from {name}
            </span>
            <p className="line-clamp-6 text-sm whitespace-pre-wrap">{report.message}</p>
          </blockquote>
          <Input.TextArea
            aria-label={`Message to ${name}`}
            placeholder={`Write a message to ${name}…`}
            maxLength={1000}
            autoSize={{ minRows: 3, maxRows: 8 }}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            autoFocus
          />
          <div className="flex flex-wrap justify-end gap-2 border-t border-divider pt-6">
            <Atom.Button
              variant="secondary"
              disabled={pending !== null}
              onClick={() => {
                setNote("");
                onCancel();
              }}
            >
              Cancel
            </Atom.Button>
            <Atom.Button
              variant="secondary"
              loading={pending === "skip"}
              disabled={pending === "send"}
              onClick={() => confirm(false)}
            >
              Skip message
            </Atom.Button>
            <Atom.Button
              loading={pending === "send"}
              disabled={!note.trim() || pending === "skip"}
              onClick={() => confirm(true)}
            >
              Send
            </Atom.Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

type ListProps = {
  onOpen: (id: number) => void;
  filter: ReportFilter;
  view: ReportView;
  patch: Report | null;
};

function useReportList(hidden: boolean, patch: Report | null) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<Report | null>(null);

  if (patch && patch !== applied) {
    setApplied(patch);
    setReports((current) =>
      current?.map((item) => (item.id === patch.id ? { ...item, ...patch } : item)) ?? null,
    );
  }

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    getReports(token, hidden)
      .then(setReports)
      .catch((e: Error) => setError(e.message));
  }, [hidden]);

  return { reports, setReports, error };
}

export function ReportBoard({ onOpen, filter, view, patch }: ListProps) {
  const { message, modal } = App.useApp();
  const myId = useAuthStore((state) => state.profile?.userId);
  const { reports, setReports, error } = useReportList(false, patch);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [finishing, setFinishing] = useState<Report | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  async function move(report: Report, status: ReportStatus, note?: string) {
    const { token } = useAuthStore.getState();
    if (!token) return;

    setReports((current) =>
      current?.map((item) =>
        item.id === report.id ? { ...item, status, resolutionNote: note || null } : item,
      ) ?? null,
    );
    try {
      const updated = await updateReportStatus(token, report.id, status, note);
      setReports((current) => current?.map((item) => (item.id === report.id ? updated : item)) ?? null);
    } catch (e) {
      setReports((current) => current?.map((item) => (item.id === report.id ? report : item)) ?? null);
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  function changeStatus(report: Report, status: ReportStatus) {
    if (report.status === status) return;
    if (status === "done") setFinishing(report);
    else move(report, status);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    const report = reports?.find(({ id }) => id === active.id);
    const status = over?.id as ReportStatus | undefined;
    if (report && status) changeStatus(report, status);
  }

  function handleHide(report: Report) {
    modal.confirm({
      title: `Hide report ${ticketNumber(report.id)}?`,
      content: `It moves to the Hidden tab. ${displayName(report.author)} won’t be notified and will still see it in their reports.`,
      okText: "Hide",
      cancelText: "Cancel",
      onOk: async () => {
        const { token } = useAuthStore.getState();
        if (!token) return;
        try {
          await setReportHidden(token, report.id, true);
          setReports((current) => current?.filter(({ id }) => id !== report.id) ?? null);
          message.success(`Report ${ticketNumber(report.id)} hidden.`);
        } catch (e) {
          message.error(e instanceof Error ? e.message : "Something went wrong.");
        }
      },
    });
  }

  if (error) {
    return (
      <Molecule.FeedState
        role="alert"
        eyebrow="Reports"
        icon={<CloudOff size={24} strokeWidth={1.5} />}
        title="Reports couldn’t be loaded."
        description={error}
      />
    );
  }

  if (!reports) return <Molecule.FeedSkeleton label="Loading reports…" />;

  if (reports.length === 0) {
    return (
      <Molecule.FeedState
        eyebrow="Reports"
        icon={<Inbox size={24} strokeWidth={1.5} />}
        title="No reports yet."
        description="Feedback people send from the button in the corner will show up here."
      />
    );
  }

  const shown = reports.filter((report) => matchesFilter(report, filter, myId));
  const active = reports.find(({ id }) => id === activeId);
  const doneModal = (
    <DoneModal
      report={finishing}
      onCancel={() => setFinishing(null)}
      onConfirm={async (note) => {
        const report = finishing;
        setFinishing(null);
        if (report) await move(report, "done", note);
      }}
    />
  );

  if (view === "list") {
    return (
      <>
        {shown.length === 0 ? (
          <NoMatches />
        ) : (
          <ReportList
            reports={shown}
            onOpen={onOpen}
            action={(report) => (
              <>
                <Select<ReportStatus>
                  size="small"
                  aria-label={`Status of ${ticketNumber(report.id)}`}
                  value={report.status}
                  onChange={(status) => changeStatus(report, status)}
                  popupMatchSelectWidth={false}
                  className="w-32"
                  options={columns.map(({ status, title }) => ({ value: status, label: title }))}
                />
                <HideButton report={report} onHide={handleHide} />
              </>
            )}
          />
        )}
        {doneModal}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }) => setActiveId(Number(active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2">
        {columns.map((column) => (
          <Column
            key={column.status}
            {...column}
            reports={shown.filter(({ status }) => status === column.status)}
            onHide={handleHide}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>{active && <ReportCard report={active} dragging />}</DragOverlay>
      {doneModal}
    </DndContext>
  );
}

export function HiddenReports({ onOpen, filter, view, patch }: ListProps) {
  const { message, modal } = App.useApp();
  const myId = useAuthStore((state) => state.profile?.userId);
  const { reports, setReports, error } = useReportList(true, patch);
  const [restoring, setRestoring] = useState<number | null>(null);

  async function restore(report: Report) {
    const { token } = useAuthStore.getState();
    if (!token) return;

    setRestoring(report.id);
    try {
      await setReportHidden(token, report.id, false);
      setReports((current) => current?.filter(({ id }) => id !== report.id) ?? null);
      message.success(`Report ${ticketNumber(report.id)} moved back to To do.`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setRestoring(null);
    }
  }

  if (error) {
    return (
      <Molecule.FeedState
        role="alert"
        eyebrow="Hidden reports"
        icon={<CloudOff size={24} strokeWidth={1.5} />}
        title="Hidden reports couldn’t be loaded."
        description={error}
      />
    );
  }

  if (!reports) return <Molecule.FeedSkeleton label="Loading hidden reports…" />;

  if (reports.length === 0) {
    return (
      <Molecule.FeedState
        eyebrow="Hidden reports"
        icon={<EyeOff size={24} strokeWidth={1.5} />}
        title="Nothing hidden."
        description="Reports you hide from the board show up here."
      />
    );
  }

  const shown = reports.filter((report) => matchesFilter(report, filter, myId));
  const confirmRestore = (report: Report) =>
    modal.confirm({
      title: `Move report ${ticketNumber(report.id)} back to To do?`,
      content: `It goes back on the board in To do${
        report.resolutionNote ? " and its reply is cleared" : ""
      }. ${displayName(report.author)} won’t be notified.`,
      okText: "Move back",
      cancelText: "Cancel",
      onOk: () => restore(report),
    });
  const restoreButton = (report: Report) => (
    <Atom.Button
      size="small"
      variant="secondary"
      icon={<RotateCcw size={14} />}
      loading={restoring === report.id}
      onClick={() => confirmRestore(report)}
    >
      Move back to To do
    </Atom.Button>
  );

  if (shown.length === 0) return <NoMatches />;

  if (view === "list") {
    return <ReportList reports={shown} onOpen={onOpen} action={restoreButton} />;
  }

  return (
    <ul className="mx-auto grid w-full max-w-[880px] grid-cols-1 gap-3 md:grid-cols-2">
      {shown.map((report) => (
        <li key={report.id} className="flex flex-col gap-2">
          <div
            role="button"
            tabIndex={0}
            aria-label={`Open report ${ticketNumber(report.id)}`}
            onClick={() => onOpen(report.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(report.id);
              }
            }}
            className="focus-ring cursor-pointer rounded-lg"
          >
            <ReportCard report={report} />
          </div>
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] text-muted">
              Hidden {report.hiddenAt ? timeAgo(report.hiddenAt) : ""}
            </span>
            {restoreButton(report)}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ReportComments({
  report,
  onAdded,
}: {
  report: Report;
  onAdded: (count: number) => void;
}) {
  const [comments, setComments] = useState<ReportComment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token) return;
    let ignore = false;
    getReportComments(token, report.id)
      .then((list) => {
        if (!ignore) setComments(list);
      })
      .catch((e: Error) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, [report.id]);

  async function submit() {
    const { token } = useAuthStore.getState();
    const content = draft.trim();
    if (!token || !content) return;

    setPending(true);
    setError(null);
    try {
      const comment = await addReportComment(token, report.id, content);
      const next = [...(comments ?? []), comment];
      setComments(next);
      setDraft("");
      onAdded(next.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 border-t border-divider pt-5">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        <MessageSquare size={14} aria-hidden />
        Comments
        {comments && <span className="text-xs font-normal text-muted">{comments.length}</span>}
        <span className="ml-auto text-[11px] font-normal text-muted">Only admins can see these</span>
      </h3>
      {!comments ? (
        error ? null : (
          <div className="flex py-2">
            <Atom.Loader />
          </div>
        )
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-2.5">
              <Atom.Avatar
                size="xs"
                label={displayName(comment.author)}
                src={comment.author.avatarUrl}
                seed={comment.author.id}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-xs">
                  <span className="font-semibold">{displayName(comment.author)}</span>{" "}
                  <span className="text-muted">{timeAgo(comment.createdAt)}</span>
                </span>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
      <div className="flex flex-col gap-2">
        <Input.TextArea
          aria-label="Write a comment"
          placeholder="Write a comment…"
          maxLength={2000}
          autoSize={{ minRows: 2, maxRows: 6 }}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <Atom.Button
          size="small"
          loading={pending}
          disabled={!draft.trim()}
          onClick={submit}
          className="w-fit self-end"
        >
          Comment
        </Atom.Button>
      </div>
    </section>
  );
}

export function ReportModal({
  reportId,
  admins,
  onClose,
  onChange,
}: {
  reportId: number | null;
  admins: ReportAdmin[];
  onClose: () => void;
  onChange: (report: Report) => void;
}) {
  const { message } = App.useApp();
  const myId = useAuthStore((state) => state.profile?.userId);
  const [loaded, setLoaded] = useState<{ id: number; report: Report | null; failed?: boolean } | null>(
    null,
  );
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const { token } = useAuthStore.getState();
    if (!token || reportId === null) return;
    let ignore = false;
    getReport(token, reportId)
      .then((report) => {
        if (!ignore) setLoaded({ id: reportId, report });
      })
      .catch(() => {
        if (!ignore) setLoaded({ id: reportId, report: null, failed: true });
      });
    return () => {
      ignore = true;
    };
  }, [reportId]);

  function update(report: Report) {
    setLoaded((current) => (current?.id === report.id ? { ...current, report } : current));
    onChange(report);
  }

  async function assign(assigneeId: number | null) {
    const { token } = useAuthStore.getState();
    const report = loaded?.report;
    if (!token || !report) return;

    setAssigning(true);
    try {
      update(await assignReport(token, report.id, assigneeId));
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAssigning(false);
    }
  }

  const current = loaded?.id === reportId ? loaded : null;
  const report = current?.report;
  const category = report ? categoryStyle[report.category] : null;
  const column = report ? columns.find(({ status }) => status === report.status) : null;

  return (
    <Modal
      open={reportId !== null}
      title={null}
      footer={null}
      width={560}
      onCancel={onClose}
      styles={{ container: { padding: 24 } }}
    >
      {!current ? (
        <div className="flex justify-center py-10">
          <Atom.Loader />
        </div>
      ) : !report || !category || !column ? (
        <Molecule.FeedState
          eyebrow="Reports"
          icon={<Inbox size={24} strokeWidth={1.5} />}
          title={current.failed ? "This report couldn’t be loaded." : "Report not found."}
          description={current.failed ? "Check your connection and try again." : "It may have been deleted."}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-3 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-muted">{ticketNumber(report.id)}</span>
              <Atom.Pill tone={category.tone} icon={category.icon}>
                {category.label}
              </Atom.Pill>
              <Atom.Pill tone="neutral" icon={column.icon}>
                {column.title}
              </Atom.Pill>
              {report.hiddenAt && (
                <Atom.Pill tone="neutral" icon={<EyeOff size={12} />}>
                  Hidden
                </Atom.Pill>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Atom.Avatar
                size="sm"
                label={displayName(report.author)}
                src={report.author.avatarUrl}
                seed={report.author.id}
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-semibold">{displayName(report.author)}</span>
                <span className="text-xs text-muted">
                  @{report.author.username} · {timeAgo(report.createdAt)}
                </span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted">
              Assignee
              <Select<number>
                size="small"
                aria-label="Assignee"
                allowClear
                placeholder="Unassigned"
                loading={assigning}
                disabled={assigning}
                value={report.assignee?.id}
                onChange={(value) => assign(value ?? null)}
                popupMatchSelectWidth={false}
                className="min-w-44"
                options={admins.map((admin) => ({
                  value: admin.id,
                  label: (
                    <span className="flex items-center gap-2">
                      <Atom.Avatar size="xs" label={displayName(admin)} src={admin.avatarUrl} seed={admin.id} />
                      {displayName(admin)}
                      {admin.id === myId && <span className="text-muted">(you)</span>}
                    </span>
                  ),
                }))}
              />
              {myId !== undefined && report.assignee?.id !== myId && (
                <button
                  type="button"
                  onClick={() => assign(myId)}
                  disabled={assigning}
                  className="focus-ring cursor-pointer rounded-sm text-accent hover:underline disabled:opacity-50"
                >
                  Assign to me
                </button>
              )}
            </label>
          </header>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{report.message}</p>
          {report.resolutionNote && (
            <div className="flex flex-col gap-1 rounded-lg bg-rail p-3">
              <span className="text-[11px] font-bold text-muted uppercase">Reply</span>
              <p className="text-sm whitespace-pre-wrap">{report.resolutionNote}</p>
            </div>
          )}
          {report.pageUrl && (
            <p className="text-xs text-muted">
              Sent from{" "}
              <Link href={report.pageUrl} prefetch={false} className="focus-ring rounded-sm text-accent hover:underline">
                {report.pageUrl}
              </Link>
            </p>
          )}
          <ReportComments
            key={report.id}
            report={report}
            onAdded={(commentCount) => update({ ...report, commentCount })}
          />
        </div>
      )}
    </Modal>
  );
}

export function DiscordWebhookButton() {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<ReportWebhook>({ url: null });
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const webhook = url.trim();
  const webhookValid = DISCORD_WEBHOOK.test(webhook);
  const unchanged = webhook === saved.url;

  async function handleOpen() {
    setOpen(true);
    setError(null);
    const { token } = useAuthStore.getState();
    if (!token) return;
    try {
      const current = await getReportWebhook(token);
      setSaved(current);
      setUrl(current.url ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function save(remove: boolean) {
    const { token } = useAuthStore.getState();
    if (!token) return;
    setError(null);
    setPending(remove ? "remove" : "save");
    try {
      const result = await setReportWebhook(token, remove ? null : { url: webhook });
      setSaved(result);
      setOpen(false);
      message.success(remove ? "Discord posting turned off." : "New reports will be posted to Discord.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <Atom.Button size="small" variant="secondary" icon={<Webhook size={14} />} onClick={handleOpen}>
        Discord
      </Atom.Button>
      <Modal
        open={open}
        title={null}
        footer={null}
        width={520}
        destroyOnHidden
        onCancel={() => setOpen(false)}
        styles={{ container: { padding: 24 } }}
      >
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (webhookValid) save(false);
          }}
        >
          <Molecule.ModalHeader
            eyebrow="Head admin"
            title="Post reports to Discord."
            description="Every new report shows up in your Discord channel as a card that links back to it."
          />
          <Molecule.FormField
            label="Webhook URL"
            name="webhook"
            placeholder="https://discord.com/api/webhooks/…"
            autoComplete="off"
            value={url}
            status={webhook && !webhookValid ? "error" : undefined}
            extra={
              webhook && !webhookValid
                ? "That doesn’t look like a Discord webhook URL."
                : "In Discord: Channel settings → Integrations → Webhooks → Copy webhook URL."
            }
            onChange={(event) => setUrl(event.target.value)}
          />
          {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-divider pt-6">
            {saved.url && (
              <Atom.Button
                danger
                variant="text"
                className="mr-auto"
                loading={pending === "remove"}
                disabled={pending === "save"}
                onClick={() => save(true)}
              >
                Turn off
              </Atom.Button>
            )}
            <Atom.Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Atom.Button>
            <Atom.Button
              type="submit"
              loading={pending === "save"}
              disabled={!webhookValid || unchanged || pending === "remove"}
            >
              Save
            </Atom.Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AdminsPanel({ admins }: { admins: ReportAdmin[] | null }) {
  const myId = useAuthStore((state) => state.profile?.userId);
  const presence = useFriendsStore((state) => state.presence);
  const statuses = useFriendsStore((state) => state.statuses);

  if (!admins) {
    return (
      <div className="flex py-8">
        <Atom.Loader />
      </div>
    );
  }

  const isOnline = (admin: ReportAdmin) => presence[admin.id] ?? admin.online;
  const isStreaming = (admin: ReportAdmin) => (statuses[admin.id] ?? admin.status) === "streaming";
  const groups: { title: string; presence: PresenceStatus; members: ReportAdmin[] }[] = [
    { title: "Streaming", presence: "streaming", members: admins.filter(isStreaming) },
    {
      title: "Online",
      presence: "online",
      members: admins.filter((admin) => !isStreaming(admin) && isOnline(admin)),
    },
    {
      title: "Offline",
      presence: "offline",
      members: admins.filter((admin) => !isStreaming(admin) && !isOnline(admin)),
    },
  ];

  return (
    <>
      <PanelHeading title={`Admins / ${admins.length}`} label="Admins" />
      {groups.map(({ title, presence: groupPresence, members }) =>
        members.length === 0 ? null : (
          <section key={title} className="flex flex-col gap-2">
            <h3 className="text-[11px] font-bold text-muted uppercase">
              {title} / {members.length}
            </h3>
            <ul className="flex flex-col">
              {members.map((admin) => (
                <PersonRow
                  key={admin.id}
                  person={{
                    userId: admin.id,
                    username: admin.username,
                    name: admin.name,
                    avatarUrl: admin.avatarUrl,
                  }}
                  presence={groupPresence}
                  twitchLogin={admin.twitchLogin}
                  badge={<Atom.RoleBadge role={admin.isHeadAdmin ? "head-admin" : "site-admin"} />}
                  subtitle={`@${admin.username}${admin.id === myId ? " · you" : ""}`}
                />
              ))}
            </ul>
          </section>
        ),
      )}
    </>
  );
}
