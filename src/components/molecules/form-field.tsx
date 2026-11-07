"use client";

import { Form } from "antd";
import { useId, type ComponentProps, type ReactNode } from "react";
import * as Atom from "@atom";

type FormFieldProps = ComponentProps<typeof Atom.Input> & {
  label: string;
  extra?: ReactNode;
};

export function FormField({ label, id, extra, ...inputProps }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <Form.Item
      label={label}
      htmlFor={inputId}
      layout="vertical"
      required={inputProps.required}
      extra={extra}
      className="m-0"
    >
      <Atom.Input id={inputId} {...inputProps} />
    </Form.Item>
  );
}

export function UsernameField(props: Omit<FormFieldProps, "label">) {
  return (
    <FormField
      label="Username"
      name="username"
      size="large"
      required
      minLength={3}
      maxLength={20}
      pattern="[A-Za-z0-9_]+"
      title="3–20 characters: letters, numbers, or underscores"
      extra="Use 3–20 letters, numbers, or underscores. No spaces or symbols."
      autoCapitalize="none"
      autoComplete="username"
      {...props}
    />
  );
}

export function CommunityNameField(props: Omit<FormFieldProps, "label">) {
  return (
    <FormField
      label="Community name"
      name="name"
      size="large"
      required
      maxLength={100}
      pattern=".*\S.*"
      title="Enter a name"
      autoComplete="off"
      {...props}
    />
  );
}
