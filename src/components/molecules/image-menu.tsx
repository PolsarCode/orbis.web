"use client";

import { App, Dropdown } from "antd";
import { ImageUp, MailCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useReadOnly } from "@/lib/read-only";
import { ImageCropModal } from "./image-crop-modal";

export type ImageCrop = {
  aspect: number | (() => number);
  round?: boolean;
  maxSize: number;
};

export function ImageMenu({
  noun,
  hasImage,
  onUpload,
  onRemove,
  crop,
  children,
}: {
  noun: string;
  hasImage: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
  crop?: ImageCrop;
  children: (busy: boolean) => ReactNode;
}) {
  const { message } = App.useApp();
  const readOnly = useReadOnly();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ file: File; aspect: number } | null>(null);
  const [cropping, setCropping] = useState(false);

  async function run(request: () => Promise<unknown>) {
    setBusy(true);
    try {
      await request();
      return true;
    } catch (cause) {
      message.error((cause as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (crop) {
      setEditing({ file, aspect: typeof crop.aspect === "function" ? crop.aspect() : crop.aspect });
      setCropping(true);
    } else {
      run(() => onUpload(file));
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />
      <Dropdown
        trigger={["click"]}
        disabled={busy}
        menu={{
          items: readOnly
            ? [
                {
                  key: "confirm",
                  icon: <MailCheck size={16} />,
                  label: (
                    <Link href="/settings?tab=account">
                      Confirm your email first to change images
                    </Link>
                  ),
                },
              ]
            : [
                {
                  key: "upload",
                  icon: <ImageUp size={16} />,
                  label: hasImage ? `Change ${noun}` : `Upload ${noun}`,
                },
                ...(hasImage
                  ? [
                      {
                        key: "remove",
                        icon: <Trash2 size={16} />,
                        label: `Remove ${noun}`,
                        danger: true,
                      },
                    ]
                  : []),
              ],
          onClick: ({ key }) => {
            if (key === "upload") input.current?.click();
            else if (key === "remove") run(onRemove);
          },
        }}
      >
        {children(busy)}
      </Dropdown>
      {crop && (
        <ImageCropModal
          open={cropping}
          file={editing?.file ?? null}
          noun={noun}
          aspect={editing?.aspect ?? 1}
          round={crop.round}
          maxSize={crop.maxSize}
          saving={busy}
          onCancel={() => setCropping(false)}
          onSave={async (file) => {
            if (await run(() => onUpload(file))) setCropping(false);
          }}
          onError={(error) => {
            message.error(error);
            setCropping(false);
          }}
        />
      )}
    </>
  );
}
