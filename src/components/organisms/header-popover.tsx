"use client";

import { Modal, Popover } from "antd";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import * as Atom from "@atom";
import { useIsPhone } from "@/lib/use-is-phone";

export const HEADER_POPOVER_LIMIT = 10;

export function HeaderPopover({
  open,
  onOpenChange,
  title,
  href,
  action,
  headerAction,
  content,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  href: string;
  action: string;
  headerAction?: ReactNode;
  content: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const isPhone = useIsPhone();
  const body = (
    <div className="flex w-full flex-col gap-3 sm:w-[340px] sm:max-w-[calc(100vw-4rem)]">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-xl font-bold">{title}</p>
        {headerAction}
      </div>
      <div className="-mx-2 max-h-[60vh] overflow-y-auto px-2">{content}</div>
      <Atom.Button
        variant="secondary"
        block
        onClick={() => {
          onOpenChange(false);
          router.push(href);
        }}
      >
        {action}
      </Atom.Button>
    </div>
  );

  return (
    <>
      <Popover
        open={open && !isPhone}
        onOpenChange={onOpenChange}
        trigger="click"
        placement="bottomRight"
        arrow={false}
        align={{ offset: [0, 8] }}
        styles={{
          container: {
            padding: 20,
            borderRadius: 12,
            boxShadow: "none",
            border: "1px solid var(--divider)",
          },
        }}
        content={body}
      >
        {children}
      </Popover>
      <Modal
        open={open && isPhone}
        onCancel={() => onOpenChange(false)}
        footer={null}
        title={null}
        closable={false}
        width={640}
        className="!top-3 !pb-0"
        styles={{ container: { padding: 20 } }}
      >
        {body}
      </Modal>
    </>
  );
}

export function HeaderPopoverNote({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-muted">{children}</p>;
}
