"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import type { RailFolder } from "@/lib/api";
import { FOLDER_COLORS } from "@/lib/rail-layout";

export function FolderSettingsModal({
  folder,
  onClose,
  onSave,
  onUngroup,
}: {
  folder: RailFolder | null;
  onClose: () => void;
  onSave: (changes: Pick<RailFolder, "name" | "color">) => void;
  onUngroup: () => void;
}) {
  return (
    <Molecule.Dialog open={folder !== null} onCancel={onClose} width={440}>
      {folder && (
        <FolderForm folder={folder} onClose={onClose} onSave={onSave} onUngroup={onUngroup} />
      )}
    </Molecule.Dialog>
  );
}

function FolderForm({
  folder,
  onClose,
  onSave,
  onUngroup,
}: {
  folder: RailFolder;
  onClose: () => void;
  onSave: (changes: Pick<RailFolder, "name" | "color">) => void;
  onUngroup: () => void;
}) {
  const [color, setColor] = useState(folder.color);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name")).trim();
    onSave({ name: name || null, color });
    onClose();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Molecule.ModalHeader
        eyebrow="Folder"
        title="Folder settings"
        description="Name your folder and pick a color. Only you see your folders."
      />
      <Molecule.FormField
        label="Folder name"
        name="name"
        size="large"
        maxLength={32}
        defaultValue={folder.name ?? ""}
        placeholder="Folder"
        autoComplete="off"
        autoFocus
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm">Color</legend>
        <div className="flex flex-wrap gap-2">
          {[{ value: null, label: "None" }, ...FOLDER_COLORS].map((option) => {
            const selected = color === option.value;
            return (
              <button
                key={option.label}
                type="button"
                aria-label={option.label}
                aria-pressed={selected}
                title={option.label}
                onClick={() => setColor(option.value)}
                style={option.value ? { backgroundColor: option.value } : undefined}
                className={`focus-ring flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-divider ${
                  option.value ? "text-white" : "bg-rail-item text-foreground"
                } ${selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-surface" : ""}`}
              >
                {selected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-5">
        <Atom.Button
          variant="secondary"
          onClick={() => {
            onUngroup();
            onClose();
          }}
        >
          Ungroup folder
        </Atom.Button>
        <Atom.Button type="submit">Save</Atom.Button>
      </div>
    </form>
  );
}
