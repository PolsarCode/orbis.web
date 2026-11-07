"use client";

import { App, Dropdown, InputNumber, Radio, Switch } from "antd";
import { Check, Globe, Lock, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  addToLibrary,
  removeFromLibrary,
  updateLibraryEntry,
  type LibraryEntry,
  type LibraryStatus,
  type MediaType,
} from "@/lib/api";
import { libraryStatuses, statusLabel } from "@/lib/library";
import { requireToken } from "@/stores/auth-store";

export function AddToLibraryButton({
  media,
  onAdded,
  size = "small",
  label = "Add to library",
}: {
  media: { type: MediaType; sourceId: string; title: string };
  onAdded: (entry: LibraryEntry) => void;
  size?: "small" | "middle" | "large";
  label?: string;
}) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<LibraryStatus>("planned");
  const [isPublic, setIsPublic] = useState(true);
  const [progress, setProgress] = useState<number | null>(0);
  const progressId = useId();
  const [pending, setPending] = useState(false);

  async function add() {
    setPending(true);
    try {
      const entry = await addToLibrary(requireToken(), {
        type: media.type,
        sourceId: media.sourceId,
        status,
        isPublic,
        ...(media.type !== "game" && { progress: progress ?? 0 }),
      });
      onAdded(entry);
      setOpen(false);
      message.success(`Added ${media.title} to your library.`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Molecule.ReadOnlyGate action="add to your library">
        <Atom.Button
          size={size}
          icon={<Plus size={14} />}
          aria-label={`Add ${media.title} to your library`}
          onClick={() => {
            setProgress(0);
            setOpen(true);
          }}
        >
          {label}
        </Atom.Button>
      </Molecule.ReadOnlyGate>
      <Molecule.Dialog open={open} width={440} onCancel={() => setOpen(false)}>
        <div className="flex flex-col gap-6">
          <Molecule.ModalHeader eyebrow="Add to library" title={media.title} />
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold">Status</span>
            <Radio.Group
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="flex flex-col gap-2"
            >
              {libraryStatuses.map((value) => (
                <Radio key={value} value={value}>
                  {statusLabel(value, media.type)}
                </Radio>
              ))}
            </Radio.Group>
          </div>
          {media.type !== "game" && (
            <div className="flex flex-col gap-2">
              <label htmlFor={progressId} className="text-[13px] font-semibold">
                {media.type === "manga" ? "Chapters read" : "Episodes watched"}
              </label>
              <InputNumber
                id={progressId}
                min={0}
                max={100000}
                step={1}
                precision={0}
                value={progress}
                onChange={setProgress}
                disabled={pending}
                className="w-full"
              />
              {status === "completed" && (
                <p className="text-xs text-muted">
                  Completed titles use the full count when available.
                </p>
              )}
            </div>
          )}
          <label className="flex items-start justify-between gap-4">
            <span className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold">Public</span>
              <span className="text-xs text-muted">
                {isPublic
                  ? "Your communities see it in their feeds, along with status updates."
                  : "Only you can see it."}
              </span>
            </span>
            <Switch checked={isPublic} onChange={setIsPublic} />
          </label>
          <div className="flex justify-end gap-2 border-t border-divider pt-6">
            <Atom.Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Atom.Button>
            <Atom.Button loading={pending} onClick={add}>
              Add
            </Atom.Button>
          </div>
        </div>
      </Molecule.Dialog>
    </>
  );
}

export function EntryMenu({
  entry,
  onChange,
  onRemove,
  trigger,
}: {
  entry: LibraryEntry;
  onChange: (entry: LibraryEntry) => void;
  onRemove: (id: number) => void;
  trigger?: React.ReactElement;
}) {
  const { message } = App.useApp();

  async function act(key: string) {
    try {
      if (key === "remove") {
        await removeFromLibrary(requireToken(), entry.id);
        onRemove(entry.id);
      } else if (key === "public" || key === "private") {
        onChange(
          await updateLibraryEntry(requireToken(), entry.id, {
            isPublic: key === "public",
          }),
        );
      } else {
        onChange(
          await updateLibraryEntry(requireToken(), entry.id, {
            status: key as LibraryStatus,
          }),
        );
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  const menu = (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          {
            key: "status",
            type: "group",
            label: "Status",
            children: libraryStatuses.map((status) => ({
              key: status,
              label: statusLabel(status, entry.mediaType),
              icon: (
                <span className="flex w-4 justify-center">
                  {status === entry.status && <Check size={14} />}
                </span>
              ),
            })),
          },
          { type: "divider" },
          entry.isPublic
            ? {
                key: "private",
                icon: <Lock size={16} />,
                label: "Make private",
              }
            : {
                key: "public",
                icon: <Globe size={16} />,
                label: "Make public",
              },
          {
            key: "remove",
            icon: <Trash2 size={16} />,
            label: "Remove",
            danger: true,
          },
        ],
        onClick: ({ key }) => act(key),
      }}
    >
      {trigger ?? (
        <button
          type="button"
          aria-label={`Options for ${entry.title}`}
          className="focus-ring flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-surface/90 text-foreground shadow-sm pointer-coarse:h-9 pointer-coarse:w-9"
        >
          <MoreHorizontal size={15} />
        </button>
      )}
    </Dropdown>
  );

  return <Molecule.ReadOnlyGate action="change your library">{menu}</Molecule.ReadOnlyGate>;
}
