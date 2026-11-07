"use client";

import { Slider } from "antd";
import { ZoomIn, ZoomOut } from "lucide-react";
import Image from "next/image";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import * as Atom from "@atom";
import { Dialog } from "./dialog";
import { ModalHeader } from "./modal-header";

const MAX_ZOOM = 3;
const KEY_STEP = 0.02;
const ZOOM_STEP = 0.1;

type View = { zoom: number; x: number; y: number };
type Size = { width: number; height: number };
type Drag = { x: number; y: number; view: View; frame: DOMRect };
type Pinch = { distance: number; zoom: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function visibleSize(image: Size, aspect: number, zoom: number): Size {
  const ratio = image.width / image.height;
  return ratio > aspect
    ? { width: aspect / ratio / zoom, height: 1 / zoom }
    : { width: 1 / zoom, height: ratio / aspect / zoom };
}

function settle(view: View, image: Size, aspect: number): View {
  const zoom = clamp(view.zoom, 1, MAX_ZOOM);
  const size = visibleSize(image, aspect, zoom);
  return {
    zoom,
    x: clamp(view.x, size.width / 2, 1 - size.width / 2),
    y: clamp(view.y, size.height / 2, 1 - size.height / 2),
  };
}

function distance(points: { x: number; y: number }[]) {
  const [a, b] = points;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function cropToFile(
  image: HTMLImageElement,
  view: View,
  aspect: number,
  maxSize: number,
): Promise<File> {
  const natural = { width: image.naturalWidth, height: image.naturalHeight };
  const size = visibleSize(natural, aspect, view.zoom);
  const sw = size.width * natural.width;
  const sh = size.height * natural.height;
  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser couldn’t edit this image.");

  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    (view.x - size.width / 2) * natural.width,
    (view.y - size.height / 2) * natural.height,
    sw,
    sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.92),
  );
  if (!blob) throw new Error("Your browser couldn’t edit this image.");
  const extension = blob.type === "image/webp" ? "webp" : "png";
  return new File([blob], `image.${extension}`, { type: blob.type });
}

function CropEditor({
  file,
  aspect,
  round,
  maxSize,
  saving,
  onCancel,
  onSave,
  onError,
}: {
  file: File;
  aspect: number;
  round: boolean;
  maxSize: number;
  saving: boolean;
  onCancel: () => void;
  onSave: (file: File) => void;
  onError: (message: string) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [view, setView] = useState<View>({ zoom: 1, x: 0.5, y: 0.5 });
  const [exporting, setExporting] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<Drag | null>(null);
  const pinch = useRef<Pinch | null>(null);

  const reportError = useEffectEvent(onError);

  useEffect(() => {
    let cancelled = false;
    const url = URL.createObjectURL(file);
    const element = new window.Image();
    element.onload = () => {
      if (cancelled) return;
      if (element.naturalWidth > 0 && element.naturalHeight > 0) setImage(element);
      else reportError("This image can’t be used. Try a JPG, PNG, or WebP.");
    };
    element.onerror = () => {
      if (!cancelled) reportError("This image can’t be opened. Try a JPG, PNG, or WebP.");
    };
    element.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const natural = image ? { width: image.naturalWidth, height: image.naturalHeight } : null;
  const size = natural ? visibleSize(natural, aspect, view.zoom) : null;

  function update(next: (view: View) => View) {
    if (!natural) return;
    setView((current) => settle(next(current), natural, aspect));
  }

  function zoomTo(zoom: number) {
    update((current) => ({ ...current, zoom }));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];
    if (points.length === 2) {
      drag.current = null;
      pinch.current = { distance: distance(points), zoom: view.zoom };
    } else if (points.length === 1) {
      drag.current = {
        x: event.clientX,
        y: event.clientY,
        view,
        frame: event.currentTarget.getBoundingClientRect(),
      };
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()];

    if (pinch.current && points.length === 2) {
      const start = pinch.current;
      if (start.distance > 0) zoomTo((start.zoom * distance(points)) / start.distance);
      return;
    }

    const start = drag.current;
    if (!start || !natural) return;
    const startSize = visibleSize(natural, aspect, start.view.zoom);
    update(() => ({
      zoom: start.view.zoom,
      x: start.view.x - ((event.clientX - start.x) / start.frame.width) * startSize.width,
      y: start.view.y - ((event.clientY - start.y) / start.frame.height) * startSize.height,
    }));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    drag.current = null;
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    zoomTo(view.zoom * Math.exp(-event.deltaY * 0.002));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!size) return;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      update((current) => ({
        ...current,
        x: current.x + move[0] * KEY_STEP * size.width,
        y: current.y + move[1] * KEY_STEP * size.height,
      }));
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomTo(view.zoom + ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomTo(view.zoom - ZOOM_STEP);
    }
  }

  async function save() {
    if (!image) return;
    setExporting(true);
    try {
      onSave(await cropToFile(image, view, aspect, maxSize));
    } catch (cause) {
      onError((cause as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        role="application"
        tabIndex={0}
        aria-label="Image position. Drag to move it, use the arrow keys to nudge it, and plus or minus to zoom."
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        style={{ aspectRatio: aspect, width: `min(100%, ${45 * aspect}dvh)` }}
        className={`focus-ring relative mx-auto touch-none overflow-hidden rounded-lg bg-black select-none ${
          image ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        {image && size ? (
          <div
            className="pointer-events-none absolute"
            style={{
              width: `${100 / size.width}%`,
              height: `${100 / size.height}%`,
              left: `${(0.5 - view.x / size.width) * 100}%`,
              top: `${(0.5 - view.y / size.height) * 100}%`,
            }}
          >
            <Image src={image.src} alt="" fill unoptimized draggable={false} />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Atom.Loader />
          </div>
        )}
        {round && (
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] inset-ring-2 inset-ring-white/80" />
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={!image || view.zoom <= 1}
          onClick={() => zoomTo(view.zoom - ZOOM_STEP)}
          className="icon-button cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ZoomOut size={18} />
        </button>
        <Slider
          aria-label="Zoom"
          className="flex-1"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          disabled={!image}
          tooltip={{ formatter: (value) => `${Math.round((value ?? 1) * 100)}%` }}
          onChange={zoomTo}
        />
        <button
          type="button"
          aria-label="Zoom in"
          disabled={!image || view.zoom >= MAX_ZOOM}
          onClick={() => zoomTo(view.zoom + ZOOM_STEP)}
          className="icon-button cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ZoomIn size={18} />
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <Atom.Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Atom.Button>
        <Atom.Button onClick={save} loading={saving || exporting} disabled={!image}>
          Save
        </Atom.Button>
      </div>
    </div>
  );
}

export function ImageCropModal({
  open,
  file,
  noun,
  aspect,
  round = false,
  maxSize,
  saving,
  onCancel,
  onSave,
  onError,
}: {
  open: boolean;
  file: File | null;
  noun: string;
  aspect: number;
  round?: boolean;
  maxSize: number;
  saving: boolean;
  onCancel: () => void;
  onSave: (file: File) => void;
  onError: (message: string) => void;
}) {
  return (
    <Dialog
      open={open}
      onCancel={saving ? undefined : onCancel}
      mask={{ closable: !saving }}
      closable={!saving}
      width={aspect > 2 ? 760 : 480}
      centered
    >
      <div className="flex flex-col gap-6">
        <ModalHeader
          eyebrow={`New ${noun}`}
          title="Position and zoom"
          description="Drag to move it. Zoom with the slider, your scroll wheel, or a pinch."
        />
        {file && (
          <CropEditor
            key={`${file.name}-${file.lastModified}-${file.size}`}
            file={file}
            aspect={aspect}
            round={round}
            maxSize={maxSize}
            saving={saving}
            onCancel={onCancel}
            onSave={onSave}
            onError={onError}
          />
        )}
      </div>
    </Dialog>
  );
}
