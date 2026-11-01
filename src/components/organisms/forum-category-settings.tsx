"use client";

import {
  closestCenter,
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { App, Input, Select, Tooltip } from "antd";
import { GripVertical, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  createForumCategory,
  createForumSection,
  deleteForumCategory,
  deleteForumSection,
  getForum,
  reorderForumCategories,
  reorderForumSections,
  updateForumCategory,
  updateForumSection,
  type Community,
  type ForumCategory,
  type ForumIndex,
  type ForumSection,
} from "@/lib/api";
import { useReadOnly } from "@/lib/read-only";
import { useAuthStore } from "@/stores/auth-store";
import { forumToken } from "./forum-shared";

const CATEGORY_LIMIT = 30;
const SECTION_LIMIT = 10;
const NAME_MAX = 60;
const DESCRIPTION_MAX = 300;
const NO_SECTION = 0;

type Draft = { name: string; description: string; sectionId: number | null };

const emptyDraft: Draft = { name: "", description: "", sectionId: null };

const sectionKey = (id: number) => `section-${id}`;
const categoryKey = (id: number) => `category-${id}`;
const groupKey = (sectionId: number | null) => `group-${sectionId ?? "none"}`;
const idOf = (key: UniqueIdentifier) => Number(String(key).split("-").pop());

function errorText(reason: unknown) {
  return reason instanceof Error ? reason.message : "Something went wrong.";
}

function groupsOf({ sections, categories }: ForumIndex) {
  return [
    { section: null, categories: categories.filter(({ sectionId }) => sectionId === null) },
    ...sections.map((section) => ({
      section,
      categories: categories.filter(({ sectionId }) => sectionId === section.id),
    })),
  ];
}

function placeCategory(
  forum: ForumIndex,
  categoryId: number,
  sectionId: number | null,
  beforeId: number | null,
) {
  const moving = forum.categories.find(({ id }) => id === categoryId);
  if (!moving) return forum.categories;
  const rest = { ...forum, categories: forum.categories.filter(({ id }) => id !== categoryId) };

  return groupsOf(rest).flatMap((group) => {
    if ((group.section?.id ?? null) !== sectionId) return group.categories;
    const items = [...group.categories];
    const index = beforeId === null ? -1 : items.findIndex(({ id }) => id === beforeId);
    items.splice(index === -1 ? items.length : index, 0, { ...moving, sectionId });
    return items;
  });
}

function useDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function SortableRow({
  id,
  label,
  disabled,
  children,
}: {
  id: string;
  label: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`flex items-start gap-2 bg-surface p-3 ${isDragging ? "opacity-40" : ""}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${label}`}
        disabled={disabled}
        className="icon-button h-8 w-6 shrink-0 cursor-grab touch-none active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      >
        <GripVertical size={16} />
      </button>
      {children}
    </li>
  );
}

function DragPreview({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex cursor-grabbing items-center gap-2 rounded-lg border border-accent bg-surface p-3 shadow-lg">
      <GripVertical size={16} aria-hidden className="shrink-0 text-muted" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{title}</span>
        {subtitle && <span className="truncate text-xs text-muted">{subtitle}</span>}
      </div>
    </div>
  );
}

function IconButton({
  label,
  disabled,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip title={label}>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={`icon-button h-8 w-8 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
          danger ? "hover:text-danger" : ""
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function RowActions({
  readOnly,
  onEdit,
  onDelete,
}: {
  readOnly: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center">
      <IconButton label="Edit" disabled={readOnly} onClick={onEdit}>
        <Pencil size={16} />
      </IconButton>
      <IconButton label="Delete" danger disabled={readOnly} onClick={onDelete}>
        <Trash2 size={16} />
      </IconButton>
    </div>
  );
}

function CategoryFields({
  draft,
  sections,
  onChange,
  autoFocus = false,
}: {
  draft: Draft;
  sections: ForumSection[];
  onChange: (draft: Draft) => void;
  autoFocus?: boolean;
}) {
  return (
    <>
      <Atom.Input
        autoFocus={autoFocus}
        value={draft.name}
        maxLength={NAME_MAX}
        placeholder="Name, like General or Episode discussion"
        aria-label="Category name"
        onChange={(event) => onChange({ ...draft, name: event.target.value })}
      />
      <Input.TextArea
        value={draft.description}
        maxLength={DESCRIPTION_MAX}
        autoSize={{ minRows: 1, maxRows: 4 }}
        placeholder="What belongs here? (optional)"
        aria-label="Category description"
        onChange={(event) => onChange({ ...draft, description: event.target.value })}
      />
      {sections.length > 0 && (
        <Select
          aria-label="Section"
          value={draft.sectionId ?? NO_SECTION}
          onChange={(value: number) =>
            onChange({ ...draft, sectionId: value === NO_SECTION ? null : value })
          }
          options={[
            { value: NO_SECTION, label: "No section" },
            ...sections.map(({ id, name }) => ({ value: id, label: `In ${name}` })),
          ]}
        />
      )}
    </>
  );
}

function SectionSettings({
  communityId,
  forum,
  readOnly,
  onChange,
}: {
  communityId: number;
  forum: ForumIndex;
  readOnly: boolean;
  onChange: (forum: ForumIndex) => void;
}) {
  const { modal, message } = App.useApp();
  const sensors = useDragSensors();
  const [adding, setAdding] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sections, categories } = forum;
  const draggingSection = sections.find(({ id }) => id === dragging);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!adding.trim()) return;
    setPending(true);
    setError(null);
    try {
      const section = await createForumSection(forumToken(), communityId, adding);
      onChange({ ...forum, sections: [...sections, section] });
      setAdding("");
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setPending(false);
    }
  }

  async function rename(event: FormEvent) {
    event.preventDefault();
    if (!editing?.name.trim()) return;
    setPending(true);
    setError(null);
    try {
      const updated = await updateForumSection(forumToken(), communityId, editing.id, editing.name);
      onChange({
        ...forum,
        sections: sections.map((section) => (section.id === updated.id ? updated : section)),
      });
      setEditing(null);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setPending(false);
    }
  }

  async function drop({ active, over }: DragEndEvent) {
    setDragging(null);
    if (!over || active.id === over.id) return;
    const from = sections.findIndex(({ id }) => id === idOf(active.id));
    const to = sections.findIndex(({ id }) => id === idOf(over.id));
    if (from === -1 || to === -1) return;
    const next = arrayMove(sections, from, to);
    onChange({ ...forum, sections: next });
    try {
      await reorderForumSections(
        forumToken(),
        communityId,
        next.map(({ id }) => id),
      );
    } catch (reason) {
      onChange(forum);
      message.error(errorText(reason));
    }
  }

  function remove(section: ForumSection) {
    const count = categories.filter(({ sectionId }) => sectionId === section.id).length;
    modal.confirm({
      title: `Delete the “${section.name}” section?`,
      content:
        count > 0
          ? `Its ${count} ${count === 1 ? "category stays" : "categories stay"}, with every thread, and ${count === 1 ? "shows" : "show"} without a section.`
          : "Nothing else is deleted.",
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () =>
        deleteForumSection(forumToken(), communityId, section.id)
          .then(() =>
            onChange({
              sections: sections.filter(({ id }) => id !== section.id),
              categories: categories.map((category) =>
                category.sectionId === section.id ? { ...category, sectionId: null } : category,
              ),
            }),
          )
          .catch((reason: Error) => {
            message.error(reason.message);
          }),
    });
  }

  return (
    <Molecule.SettingsSection
      title="Forum sections"
      aside={`${sections.length} / ${SECTION_LIMIT}`}
      description="Group categories under a heading, like Anime › Episode discussion. Sections are optional. Drag to reorder them."
    >
      {sections.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={({ active }) => setDragging(idOf(active.id))}
          onDragCancel={() => setDragging(null)}
          onDragEnd={drop}
        >
          <SortableContext items={sections.map(({ id }) => sectionKey(id))} strategy={verticalListSortingStrategy}>
            <ol
              aria-label="Sections"
              className="flex flex-col divide-y divide-divider overflow-hidden rounded-lg border border-divider"
            >
              {sections.map((section) => (
                <SortableRow
                  key={section.id}
                  id={sectionKey(section.id)}
                  label={section.name}
                  disabled={readOnly || editing !== null}
                >
                  {editing?.id === section.id ? (
                    <form onSubmit={rename} className="flex flex-1 flex-wrap items-center gap-2">
                      <Atom.Input
                        autoFocus
                        value={editing.name}
                        maxLength={NAME_MAX}
                        aria-label="Section name"
                        className="min-w-40 flex-1"
                        onChange={(event) => setEditing({ id: section.id, name: event.target.value })}
                      />
                      <Atom.Button type="submit" size="small" loading={pending} disabled={!editing.name.trim()}>
                        Save
                      </Atom.Button>
                      <Atom.Button size="small" variant="secondary" onClick={() => setEditing(null)}>
                        Cancel
                      </Atom.Button>
                    </form>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 self-center truncate text-sm font-semibold">
                        {section.name}
                      </span>
                      <RowActions
                        readOnly={readOnly}
                        onEdit={() => setEditing({ id: section.id, name: section.name })}
                        onDelete={() => remove(section)}
                      />
                    </>
                  )}
                </SortableRow>
              ))}
            </ol>
          </SortableContext>
          <DragOverlay>
            {draggingSection && <DragPreview title={draggingSection.name} />}
          </DragOverlay>
        </DndContext>
      )}
      {sections.length < SECTION_LIMIT ? (
        <form onSubmit={add} className="flex flex-wrap items-center gap-2">
          <Atom.Input
            value={adding}
            maxLength={NAME_MAX}
            placeholder="New section, like Anime or Games"
            aria-label="New section name"
            className="min-w-40 flex-1"
            onChange={(event) => setAdding(event.target.value)}
          />
          <Atom.Button
            type="submit"
            size="small"
            icon={<Plus size={14} />}
            loading={pending && !editing}
            disabled={readOnly || !adding.trim()}
          >
            Add section
          </Atom.Button>
        </form>
      ) : (
        <p className="text-xs text-muted">
          You’ve reached {SECTION_LIMIT} sections. Delete one to add another.
        </p>
      )}
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
    </Molecule.SettingsSection>
  );
}

function CategoryGroup({
  id,
  title,
  empty,
  children,
}: {
  id: string;
  title?: string;
  empty: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col gap-2">
      {title && <h4 className="text-xs font-bold tracking-wide text-muted uppercase">{title}</h4>}
      {empty ? (
        <p
          ref={setNodeRef}
          className={`rounded-lg border border-dashed p-3 text-center text-xs text-muted transition-colors ${
            isOver ? "border-accent text-foreground" : "border-divider"
          }`}
        >
          Drag a category here
        </p>
      ) : (
        <ol
          ref={setNodeRef}
          aria-label={title ? `Categories in ${title}` : "Categories"}
          className={`flex flex-col divide-y divide-divider overflow-hidden rounded-lg border transition-colors ${
            isOver ? "border-accent" : "border-divider"
          }`}
        >
          {children}
        </ol>
      )}
    </div>
  );
}

function CategorySettings({
  communityId,
  forum,
  readOnly,
  onChange,
}: {
  communityId: number;
  forum: ForumIndex;
  readOnly: boolean;
  onChange: (forum: ForumIndex) => void;
}) {
  const { modal, message } = App.useApp();
  const sensors = useDragSensors();
  const [editing, setEditing] = useState<{ id: number; draft: Draft } | null>(null);
  const [adding, setAdding] = useState<Draft>(emptyDraft);
  const [dragging, setDragging] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const before = useRef<ForumIndex | null>(null);
  const { sections, categories } = forum;
  const groups = groupsOf(forum);
  const draggingCategory = categories.find(({ id }) => id === dragging);

  function containerOf(key: UniqueIdentifier) {
    const value = String(key);
    if (value.startsWith("group-")) {
      const id = value.slice("group-".length);
      return id === "none" ? null : Number(id);
    }
    return categories.find(({ id }) => id === idOf(key))?.sectionId ?? null;
  }

  function moveAcross({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = containerOf(active.id);
    const to = containerOf(over.id);
    if (from === to) return;
    const beforeId = String(over.id).startsWith("category-") ? idOf(over.id) : null;
    onChange({ ...forum, categories: placeCategory(forum, idOf(active.id), to, beforeId) });
  }

  async function drop({ active, over }: DragEndEvent) {
    setDragging(null);
    const original = before.current;
    before.current = null;
    if (!original) return;

    let next = categories;
    if (over && active.id !== over.id && String(over.id).startsWith("category-")) {
      const sectionId = containerOf(active.id);
      const group = categories.filter((category) => category.sectionId === sectionId);
      const from = group.findIndex(({ id }) => id === idOf(active.id));
      const to = group.findIndex(({ id }) => id === idOf(over.id));
      if (from !== -1 && to !== -1 && from !== to) {
        const moved = arrayMove(group, from, to);
        next = groupsOf(forum).flatMap((item) =>
          (item.section?.id ?? null) === sectionId ? moved : item.categories,
        );
      }
    }

    const movedId = idOf(active.id);
    const sectionBefore = original.categories.find(({ id }) => id === movedId)?.sectionId ?? null;
    const sectionAfter = next.find(({ id }) => id === movedId)?.sectionId ?? null;
    const orderChanged = next.some(({ id }, index) => original.categories[index]?.id !== id);
    if (!orderChanged && sectionBefore === sectionAfter) {
      onChange(original);
      return;
    }

    onChange({ ...forum, categories: next });
    try {
      if (sectionBefore !== sectionAfter) {
        await updateForumCategory(forumToken(), communityId, movedId, { sectionId: sectionAfter });
      }
      await reorderForumCategories(
        forumToken(),
        communityId,
        next.map(({ id }) => id),
      );
    } catch (reason) {
      onChange(original);
      message.error(errorText(reason));
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!adding.name.trim()) return;
    setPending(true);
    setError(null);
    try {
      const category = await createForumCategory(forumToken(), communityId, adding);
      onChange({ ...forum, categories: [...categories, category] });
      setAdding({ ...emptyDraft, sectionId: adding.sectionId });
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setPending(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setPending(true);
    setError(null);
    try {
      const updated = await updateForumCategory(forumToken(), communityId, editing.id, editing.draft);
      onChange({
        ...forum,
        categories: categories.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      });
      setEditing(null);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setPending(false);
    }
  }

  function remove(category: ForumCategory) {
    modal.confirm({
      title: `Delete “${category.name}”?`,
      content:
        category.threadCount > 0
          ? `Its ${category.threadCount} ${category.threadCount === 1 ? "thread is" : "threads are"} deleted with it, along with every reply. This can’t be undone.`
          : "This can’t be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: () =>
        deleteForumCategory(forumToken(), communityId, category.id)
          .then(() =>
            onChange({ ...forum, categories: categories.filter(({ id }) => id !== category.id) }),
          )
          .catch((reason: Error) => {
            message.error(reason.message);
          }),
    });
  }

  const shownGroups =
    sections.length > 0 ? groups : groups.filter((group) => group.categories.length > 0);

  return (
    <Molecule.SettingsSection
      title="Forum categories"
      aside={`${categories.length} / ${CATEGORY_LIMIT}`}
      description={
        sections.length > 0
          ? "Members start threads inside these categories. Drag to reorder them, or into another section."
          : "Members start threads inside these categories. Drag to put the ones people need most at the top."
      }
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={({ active }) => {
          before.current = forum;
          setDragging(idOf(active.id));
        }}
        onDragOver={moveAcross}
        onDragCancel={() => {
          if (before.current) onChange(before.current);
          before.current = null;
          setDragging(null);
        }}
        onDragEnd={drop}
      >
        {shownGroups.map((group) => (
          <SortableContext
            key={groupKey(group.section?.id ?? null)}
            items={group.categories.map(({ id }) => categoryKey(id))}
            strategy={verticalListSortingStrategy}
          >
            <CategoryGroup
              id={groupKey(group.section?.id ?? null)}
              title={sections.length > 0 ? (group.section?.name ?? "No section") : undefined}
              empty={group.categories.length === 0}
            >
              {group.categories.map((category) => (
                <SortableRow
                  key={category.id}
                  id={categoryKey(category.id)}
                  label={category.name}
                  disabled={readOnly || editing !== null}
                >
                  {editing?.id === category.id ? (
                    <form onSubmit={save} className="flex flex-1 flex-col gap-2">
                      <CategoryFields
                        autoFocus
                        draft={editing.draft}
                        sections={sections}
                        onChange={(draft) => setEditing({ id: category.id, draft })}
                      />
                      <div className="flex gap-2">
                        <Atom.Button
                          type="submit"
                          size="small"
                          loading={pending}
                          disabled={!editing.draft.name.trim()}
                        >
                          Save
                        </Atom.Button>
                        <Atom.Button size="small" variant="secondary" onClick={() => setEditing(null)}>
                          Cancel
                        </Atom.Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 self-center">
                        <span className="truncate text-sm font-semibold">{category.name}</span>
                        {category.description && (
                          <span className="line-clamp-2 text-xs text-muted">{category.description}</span>
                        )}
                        <span className="text-xs text-muted">
                          {category.threadCount} {category.threadCount === 1 ? "thread" : "threads"}
                        </span>
                      </div>
                      <RowActions
                        readOnly={readOnly}
                        onEdit={() =>
                          setEditing({
                            id: category.id,
                            draft: {
                              name: category.name,
                              description: category.description,
                              sectionId: category.sectionId,
                            },
                          })
                        }
                        onDelete={() => remove(category)}
                      />
                    </>
                  )}
                </SortableRow>
              ))}
            </CategoryGroup>
          </SortableContext>
        ))}
        <DragOverlay>
          {draggingCategory && (
            <DragPreview
              title={draggingCategory.name}
              subtitle={`${draggingCategory.threadCount} ${draggingCategory.threadCount === 1 ? "thread" : "threads"}`}
            />
          )}
        </DragOverlay>
      </DndContext>
      {categories.length < CATEGORY_LIMIT ? (
        <form onSubmit={add} className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">Add a category</h4>
          <CategoryFields draft={adding} sections={sections} onChange={setAdding} />
          <Atom.Button
            type="submit"
            size="small"
            icon={<Plus size={14} />}
            loading={pending && !editing}
            disabled={readOnly || !adding.name.trim()}
            className="w-fit"
          >
            Add category
          </Atom.Button>
        </form>
      ) : (
        <p className="text-xs text-muted">
          You’ve reached {CATEGORY_LIMIT} categories. Delete one to add another.
        </p>
      )}
      {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
    </Molecule.SettingsSection>
  );
}

export function ForumCategorySettings({ community }: { community: Community }) {
  const readOnly = useReadOnly();
  const [forum, setForum] = useState<ForumIndex | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    getForum(useAuthStore.getState().token, community.id)
      .then((result) => {
        if (!ignore) setForum(result);
      })
      .catch(() => {
        if (!ignore) setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [community.id]);

  if (failed) return <Atom.ErrorMessage>Could not load the forum settings.</Atom.ErrorMessage>;
  if (!forum) return <Atom.Loader />;

  return (
    <>
      {readOnly && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-divider bg-surface p-3 text-[13px] text-muted">
          <Lock size={16} aria-hidden className="shrink-0" />
          Confirm your email to change the forum.
        </p>
      )}
      <CategorySettings
        communityId={community.id}
        forum={forum}
        readOnly={readOnly}
        onChange={setForum}
      />
      <SectionSettings
        communityId={community.id}
        forum={forum}
        readOnly={readOnly}
        onChange={setForum}
      />
    </>
  );
}
