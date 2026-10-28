"use client";

import { Input, Modal, Segmented, Tooltip } from "antd";
import { BookUser, CircleCheck, Inbox, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { submitReport, type ReportCategory } from "@/lib/api";
import { ticketNumber } from "@/lib/ticket";
import { useReadOnly } from "@/lib/read-only";
import { useAuthStore } from "@/stores/auth-store";
import { useLayoutStore } from "@/stores/layout-store";

const categories: { value: ReportCategory; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "idea", label: "Idea" },
  { value: "other", label: "Other" },
];

const dockButton =
  "focus-ring flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border shadow-[0_8px_20px_-10px_rgb(0_0_0/0.45)] transition-colors";

function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ticket, setTicket] = useState<number | null>(null);
  const [category, setCategory] = useState<ReportCategory>("bug");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setTicket(null);
    setCategory("bug");
    setText("");
    setError(null);
    onClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { token } = useAuthStore.getState();
    if (!token) return;

    setPending(true);
    setError(null);
    try {
      const { id } = await submitReport(token, {
        category,
        message: text.trim(),
        pageUrl: pathname,
      });
      setTicket(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      title={null}
      onCancel={handleClose}
      footer={null}
      width={520}
      destroyOnHidden
      styles={{ container: { padding: 24 } }}
    >
      {ticket !== null ? (
        <div className="flex flex-col items-start gap-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground">
            <CircleCheck size={24} />
          </span>
          <Molecule.ModalHeader
            eyebrow="Report sent"
            title={`Ticket ${ticketNumber(ticket)}`}
            description="Thanks for letting us know. We’ll notify you when its status changes, and you can follow it in your reports."
          />
          <div className="flex w-full justify-end gap-2 border-t border-divider pt-6">
            <Atom.Button variant="secondary" onClick={handleClose}>
              Close
            </Atom.Button>
            <Atom.Button
              onClick={() => {
                handleClose();
                router.push("/reports");
              }}
            >
              View my reports
            </Atom.Button>
          </div>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Molecule.ModalHeader
          eyebrow="Feedback"
          title="Report something."
          description="Found a bug or have an idea? Tell us what happened. We’ll include the page you’re on."
        />
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Type</span>
          <Segmented<ReportCategory>
            block
            options={categories}
            value={category}
            onChange={setCategory}
          />
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">What happened?</span>
          <Input.TextArea
            required
            autoFocus
            maxLength={2000}
            showCount
            autoSize={{ minRows: 4, maxRows: 10 }}
            placeholder="Describe the problem or idea…"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex justify-end gap-2 border-t border-divider pt-6">
          <Atom.Button variant="secondary" onClick={handleClose}>
            Cancel
          </Atom.Button>
          <Atom.Button type="submit" loading={pending} disabled={!text.trim()}>
            Send report
          </Atom.Button>
        </div>
      </form>
      )}
    </Modal>
  );
}

export function FeedbackDock() {
  const profile = useAuthStore((state) => state.profile);
  const readOnly = useReadOnly();
  const open = useLayoutStore((state) => state.feedbackOpen);
  const setOpen = useLayoutStore((state) => state.setFeedbackOpen);
  const dock = useRef<HTMLDivElement>(null);
  const signedIn = profile !== null;

  useEffect(() => {
    const element = dock.current;
    if (!element) return;

    const root = document.documentElement;
    const measure = () =>
      root.style.setProperty(
        "--feedback-dock-space",
        element.offsetParent
          ? `${window.innerHeight - element.getBoundingClientRect().top}px`
          : "0px",
      );
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty("--feedback-dock-space");
    };
  }, [signedIn]);

  if (!profile) return null;
  const reportsLabel = profile.isAdmin ? "View reports" : "My reports";

  return (
    <>
      <div
        ref={dock}
        className="fixed right-4 bottom-[calc(1rem+var(--library-dock-height,0px))] z-40 hidden flex-col items-center gap-3 sm:right-6 sm:flex sm:bottom-[calc(1.5rem+var(--library-dock-height,0px))]"
      >
        {profile.isAdmin && (
          <Tooltip title="Directory" placement="left">
            <Link
              href="/directory"
              aria-label="Directory"
              className={`${dockButton} border-divider bg-surface text-foreground hover:bg-rail-item`}
            >
              <BookUser size={20} />
            </Link>
          </Tooltip>
        )}
        <Tooltip title={reportsLabel} placement="left">
          <Link
            href="/reports"
            aria-label={reportsLabel}
            data-tour="reports"
            className={`${dockButton} border-divider bg-surface text-foreground hover:bg-rail-item`}
          >
            <Inbox size={20} />
          </Link>
        </Tooltip>
        <Tooltip
          title={readOnly ? "Confirm your email first to send feedback." : "Send feedback"}
          placement="left"
          classNames={readOnly ? { root: "touch-visible" } : undefined}
        >
          <button
            type="button"
            aria-label="Send feedback"
            aria-disabled={readOnly || undefined}
            data-tour="feedback"
            onClick={() => {
              if (!readOnly) setOpen(true);
            }}
            className={`${dockButton} border-transparent bg-accent text-accent-foreground ${
              readOnly ? "cursor-not-allowed! opacity-50" : "hover:bg-accent/90"
            }`}
          >
            <MessageSquareWarning size={20} />
          </button>
        </Tooltip>
      </div>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
