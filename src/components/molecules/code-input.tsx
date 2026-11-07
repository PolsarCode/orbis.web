"use client";

import { Input, type GetRef } from "antd";
import type { Ref } from "react";

export const CODE_LENGTH = 6;

export type CodeInputRef = GetRef<typeof Input.OTP>;

function digits(text: string) {
  return text.replace(/\D/g, "");
}

export function CodeInput({
  ref,
  value,
  onChange,
  autoFocus = false,
  disabled = false,
  invalid = false,
  className = "",
}: {
  ref?: Ref<CodeInputRef>;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <Input.OTP
      ref={ref}
      aria-label="6-digit code"
      length={CODE_LENGTH}
      size="large"
      autoFocus={autoFocus}
      disabled={disabled}
      status={invalid ? "error" : undefined}
      inputMode="numeric"
      autoComplete="one-time-code"
      className={`*:flex-1 ${className}`}
      classNames={{ input: "w-full text-lg" }}
      formatter={digits}
      value={value}
      onChange={onChange}
      onPaste={(event) => {
        event.preventDefault();
        onChange(digits(event.clipboardData.getData("text")).slice(0, CODE_LENGTH));
      }}
    />
  );
}
