"use client";

import { Switch } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import { useCommunityStore } from "@/stores/community-store";

type CreateCommunityModalProps = {
  open: boolean;
  onClose: () => void;
};

const formId = "create-community";

export function CreateCommunityModal({ open, onClose }: CreateCommunityModalProps) {
  const router = useRouter();
  const createCommunity = useCommunityStore((state) => state.createCommunity);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  function handleClose() {
    setError(null);
    setIsPublic(true);
    onClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name")).trim();
    setError(null);
    setPending(true);

    try {
      const community = await createCommunity(name, isPublic);
      handleClose();
      router.push(`/communities/${community.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Molecule.Dialog open={open} onCancel={handleClose} width={520}>
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Molecule.ModalHeader
          eyebrow="Create a community"
          title="Create a new community."
          description="Give your community a name. You can change it and its visibility later in settings."
        />
        <Molecule.CommunityNameField autoFocus />
        <label className="flex items-start justify-between gap-4">
          <span className="flex flex-col gap-1">
            <span className="text-sm">Public community</span>
            <span className="text-xs text-muted">
              Anyone can find it in Explore and join.
            </span>
          </span>
          <Switch checked={isPublic} onChange={setIsPublic} />
        </label>
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
