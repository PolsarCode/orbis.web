"use client";

import { App, Input, Switch } from "antd";
import { ChevronDown, ImagePlus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import type { CommunityImage, CommunityLinks } from "@/lib/api";
import { useCommunityStore } from "@/stores/community-store";
import { cleanLinks, CommunityLinkFields } from "./community-links";

type CreateCommunityModalProps = {
  open: boolean;
  onClose: () => void;
};

const formId = "create-community";
const ICON_MAX_SIZE = 512;
const COVER_ASPECT = 4;

type Picked = { file: File; url: string } | null;

function usePicked() {
  const [picked, setPicked] = useState<Picked>(null);
  function pick(file: File | null) {
    setPicked((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return file ? { file, url: URL.createObjectURL(file) } : null;
    });
  }
  return [picked, pick] as const;
}

export function CreateCommunityModal({ open, onClose }: CreateCommunityModalProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const createCommunity = useCommunityStore((state) => state.createCommunity);
  const setCommunityImage = useCommunityStore((state) => state.setCommunityImage);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [description, setDescription] = useState("");
  const [icon, setIcon] = usePicked();
  const [cover, setCover] = usePicked();
  const [showLinks, setShowLinks] = useState(false);
  const [linkValues, setLinkValues] = useState<CommunityLinks>({});
  const { links, invalid } = cleanLinks(linkValues);

  function handleClose() {
    setError(null);
    setName("");
    setIsPublic(true);
    setDescription("");
    setIcon(null);
    setCover(null);
    setShowLinks(false);
    setLinkValues({});
    onClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid) {
      setShowLinks(true);
      return;
    }
    setError(null);
    setPending(true);

    try {
      const community = await createCommunity({
        name: name.trim(),
        isPublic,
        description: description.trim(),
        links,
      });
      const images: [CommunityImage, File | null][] = [
        ["icon", icon?.file ?? null],
        ["cover", cover?.file ?? null],
      ];
      for (const [image, file] of images) {
        if (!file) continue;
        try {
          await setCommunityImage(community.id, image, file);
        } catch {
          message.error(`The community was created, but its ${image} couldn’t be uploaded. You can add it from its page.`);
        }
      }
      handleClose();
      router.push(`/communities/${community.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.Dialog open={open} onCancel={handleClose} width={560}>
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Molecule.ModalHeader
          eyebrow="Create a community"
          title="Create a new community."
          description="Only the name is required. You can change everything later in settings."
        />
        <div className="relative pb-8">
          <div
            className="relative w-full overflow-hidden rounded-lg border border-divider bg-rail-item"
            style={{ aspectRatio: COVER_ASPECT }}
          >
            {cover && <Image src={cover.url} alt="" fill unoptimized className="object-cover" />}
            <Molecule.CoverButton
              hasImage={Boolean(cover)}
              aspect={() => COVER_ASPECT}
              onUpload={async (file) => setCover(file)}
              onRemove={async () => setCover(null)}
              className="absolute right-3 bottom-3"
            />
          </div>
          <Molecule.ImageMenu
            noun="icon"
            hasImage={Boolean(icon)}
            onUpload={async (file) => setIcon(file)}
            onRemove={async () => setIcon(null)}
            crop={{ aspect: 1, round: true, maxSize: ICON_MAX_SIZE }}
          >
            {() => (
              <button
                type="button"
                aria-label={icon ? "Change icon" : "Add icon"}
                className="focus-ring absolute bottom-0 left-4 flex size-16 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-surface bg-rail-item text-muted transition-colors hover:text-foreground"
              >
                {icon ? (
                  <Image src={icon.url} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <ImagePlus size={20} />
                )}
              </button>
            )}
          </Molecule.ImageMenu>
        </div>
        <Molecule.CommunityNameField
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">Description</span>
          <Input.TextArea
            name="description"
            maxLength={300}
            showCount
            autoSize={{ minRows: 2, maxRows: 5 }}
            placeholder="What’s this community about?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="text-xs text-muted">Shown on the community’s card in Explore.</span>
        </label>
        <label className="flex items-start justify-between gap-4">
          <span className="flex flex-col gap-1">
            <span className="text-sm">Public community</span>
            <span className="text-xs text-muted">
              Anyone can find it in Explore and join.
            </span>
          </span>
          <Switch checked={isPublic} onChange={setIsPublic} />
        </label>
        <div className="flex flex-col gap-4">
          <button
            type="button"
            aria-expanded={showLinks}
            onClick={() => setShowLinks((shown) => !shown)}
            className="focus-ring flex w-fit cursor-pointer items-center gap-1.5 rounded-sm text-[13px] font-semibold"
          >
            <ChevronDown
              size={16}
              className={`transition-transform motion-reduce:transition-none ${showLinks ? "" : "-rotate-90"}`}
            />
            Links
            <span className="font-normal text-muted">(optional)</span>
          </button>
          {showLinks && <CommunityLinkFields values={linkValues} onChange={setLinkValues} />}
        </div>
        {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
        <div className="flex justify-end gap-2 border-t border-divider pt-6">
          <Atom.Button variant="secondary" onClick={handleClose}>
            Cancel
          </Atom.Button>
          <Atom.Button type="submit" loading={pending}>
            Create
          </Atom.Button>
        </div>
      </form>
    </Molecule.Dialog>
  );
}
