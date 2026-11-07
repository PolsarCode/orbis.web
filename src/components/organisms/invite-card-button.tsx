"use client";

import { Switch } from "antd";
import { Download, IdCard, Users } from "lucide-react";
import { useState, type MouseEvent } from "react";
import * as Atom from "@atom";
import * as Molecule from "@molecule";
import {
  createPermanentInvite,
  downloadInviteCard,
  setInviteEnabled,
  type Community,
  type Invite,
} from "@/lib/api";
import { qrUrl } from "@/lib/invites";
import { saveFile } from "@/lib/save-file";
import { useAuthStore } from "@/stores/auth-store";

const PAPER = "#f5f2eb";
const SURFACE = "#fffefa";
const ACCENT = "#b23b26";
const INK = "#242320";
const MUTED = "#625d55";

function slugOf(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "community";
}

function CardMark() {
  return (
    <p
      className="absolute top-[2%] right-[2%] font-display leading-none font-extrabold"
      style={{ color: ACCENT, fontSize: "6.3cqw" }}
    >
      o.
    </p>
  );
}

function CardFaces({
  community,
  qrImage,
  flipped,
  onFlip,
}: {
  community: Community;
  qrImage: string | null;
  flipped: boolean;
  onFlip: () => void;
}) {
  const name = community.name;

  return (
    <div
      onClick={onFlip}
      className="relative aspect-[7/4] w-full cursor-pointer transition-transform duration-700 ease-out [transform-style:preserve-3d] motion-reduce:transition-none"
      style={{ transform: `rotateY(${flipped ? 180 : 0}deg)` }}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-[4%] shadow-[0_24px_50px_-22px_rgba(36,35,32,0.6)] [backface-visibility:hidden]"
        style={{ background: PAPER }}
      >
        <div
          className="absolute inset-y-0 left-0 w-[43%]"
          style={{
            background: community.coverUrl ? undefined : ACCENT,
            backgroundImage: community.coverUrl ? `url("${community.coverUrl}")` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          className="absolute top-1/2 left-[43%] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full"
          style={{
            width: "19cqw",
            height: "19cqw",
            background: ACCENT,
            border: `0.9cqw solid ${PAPER}`,
            backgroundImage: community.iconUrl ? `url("${community.iconUrl}")` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!community.iconUrl && (
            <span
              className="font-display font-extrabold"
              style={{ color: SURFACE, fontSize: "9cqw" }}
            >
              {name.trim().charAt(0).toUpperCase() || "O"}
            </span>
          )}
        </div>
        <div className="absolute top-[20%] left-[57%] right-[6%]">
          <p
            className="font-semibold tracking-[0.08em] uppercase"
            style={{ color: MUTED, fontSize: "2.5cqw" }}
          >
            Community on Orbis
          </p>
          <p
            className="mt-[1cqw] line-clamp-2 font-display font-extrabold break-words"
            style={{ color: INK, fontSize: "7.4cqw", lineHeight: 1 }}
          >
            {name}
          </p>
        </div>
        <p
          className="absolute bottom-[12%] left-[57%] font-semibold"
          style={{ color: ACCENT, fontSize: "3.2cqw" }}
        >
          Join us on Orbis.
        </p>
        <p
          className="absolute bottom-[6%] left-[57%] uppercase"
          style={{ color: MUTED, fontSize: "2.4cqw", letterSpacing: "0.08em" }}
        >
          By <span className="font-semibold normal-case" style={{ color: INK }}>Polsar Studio</span>
        </p>
        <CardMark />
      </div>

      <div
        className="absolute inset-0 overflow-hidden rounded-[4%] shadow-[0_24px_50px_-22px_rgba(36,35,32,0.6)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
        style={{ background: SURFACE }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: community.backgroundUrl ? `url("${community.backgroundUrl}")` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(255, 254, 250, 0.5)" }} />
        <div
          className="absolute top-[14%] left-[8%] flex aspect-square h-[72%] items-center justify-center rounded-[3cqw] border border-divider bg-white"
          style={{ padding: "2.5%" }}
        >
          <div
            className="h-full w-full bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: qrImage ? `url("${qrImage}")` : undefined }}
          />
        </div>
        <div className="absolute top-[18%] left-[60%] right-[6%]">
          <p
            className="font-semibold tracking-[0.08em] uppercase"
            style={{ color: MUTED, fontSize: "2.4cqw" }}
          >
            Scan to join
          </p>
          <p
            className="mt-[1cqw] font-display font-extrabold break-words"
            style={{ color: INK, fontSize: "6.7cqw", lineHeight: 1.02 }}
          >
            Join {name}.
          </p>
          <div className="mt-[3cqw] h-[1.4cqw] w-[14cqw] rounded-[2px]" style={{ background: ACCENT }} />
          <p className="mt-[3cqw] leading-snug" style={{ color: MUTED, fontSize: "2.5cqw" }}>
            Scan with your phone to join on Orbis.
          </p>
        </div>
        <CardMark />
      </div>
    </div>
  );
}

function Card3D({
  community,
  qrImage,
}: {
  community: Community;
  qrImage: string | null;
}) {
  const [flipped, setFlipped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  function move(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setTilt({
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onMouseMove={move}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
        className="w-full max-w-[420px] [perspective:1100px] [container-type:inline-size]"
      >
        <div
          className="transition-transform duration-300 ease-out [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: `rotateX(${-tilt.y * 16}deg) rotateY(${tilt.x * 22}deg)` }}
        >
          <CardFaces
            community={community}
            qrImage={qrImage}
            flipped={flipped}
            onFlip={() => setFlipped((value) => !value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted">Click the card to flip it · move over it to tilt</p>
    </div>
  );
}

export function InviteCardButton({ community }: { community: Community }) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<Invite | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setOpen(true);
    setError(null);
    if (qr) return;
    const { token } = useAuthStore.getState();
    if (!token) return;

    try {
      const invite = await createPermanentInvite(token, community.id);
      const { default: QRCode } = await import("qrcode");
      setQrImage(
        await QRCode.toDataURL(qrUrl(invite.code), {
          errorCorrectionLevel: "M",
          margin: 4,
          width: 512,
          color: { dark: INK, light: "#ffffff" },
        }),
      );
      setQr(invite);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load the QR.");
    }
  }

  async function toggle(enabled: boolean) {
    const { token } = useAuthStore.getState();
    if (!qr || !token) return;

    setError(null);
    try {
      setQr(await setInviteEnabled(token, community.id, qr.code, enabled));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function download() {
    const { token } = useAuthStore.getState();
    if (!qr || qr.disabledAt || !token) return;

    setError(null);
    setBusy(true);
    try {
      saveFile(await downloadInviteCard(token, community.id), `${slugOf(community.name)}-invite-card.pdf`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t create the card.");
    } finally {
      setBusy(false);
    }
  }

  const off = Boolean(qr?.disabledAt);

  return (
    <>
      <Atom.Button
        variant="secondary"
        data-tour="invite-card"
        icon={<IdCard size={16} />}
        onClick={handleOpen}
        className="shrink-0"
      >
        Invite Card
      </Atom.Button>
      <Molecule.Dialog open={open} onCancel={() => setOpen(false)} width={560}>
        <div className="flex flex-col gap-6">
          <Molecule.ModalHeader
            eyebrow="Invite Card"
            title={`A card for ${community.name}.`}
            description="A printable card to hand out in person. It has the community’s picture and a permanent QR code that opens the community when scanned. The QR never expires and can’t be deleted, but you can turn it off and back on. The counter shows how many people have joined through it."
          />
          <Card3D community={community} qrImage={qrImage} />
          {qr && (
            <div className="flex items-center gap-3 rounded-lg border border-divider bg-background px-4 py-3">
              <IdCard size={18} aria-hidden className="shrink-0 text-accent" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] font-semibold">Permanent QR</span>
                <span className="text-xs text-muted">{off ? "Off" : "On"} · never expires</span>
              </div>
              <span
                title="People who joined with this QR"
                className="flex shrink-0 items-center gap-1 text-xs text-muted tabular-nums"
              >
                <Users size={13} aria-hidden />
                {qr.uses} joined
              </span>
              <Switch size="small" aria-label="Permanent QR enabled" checked={!off} onChange={toggle} />
            </div>
          )}
          {error && <Atom.ErrorMessage>{error}</Atom.ErrorMessage>}
          {off && <p className="text-xs text-muted">Turn the QR back on before printing the card.</p>}
          <div className="flex justify-end">
            <Atom.Button
              icon={<Download size={16} />}
              loading={busy}
              disabled={!qr || off}
              onClick={download}
            >
              Download PDF
            </Atom.Button>
          </div>
        </div>
      </Molecule.Dialog>
    </>
  );
}
