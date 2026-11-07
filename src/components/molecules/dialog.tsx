"use client";

import { Modal, type ModalProps } from "antd";

export function Dialog(props: Omit<ModalProps, "title" | "footer" | "styles">) {
  return (
    <Modal
      title={null}
      footer={null}
      destroyOnHidden
      styles={{ container: { padding: 24 } }}
      {...props}
    />
  );
}
