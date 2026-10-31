"use client";

import { Input } from "antd";

export const CODE_LENGTH = 6;

function digits(text: string) {
  return text.replace(/\D/g, "");
}

export function CodeInput({
  value,
  onChange,
  autoFocus = false,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <Input.OTP
      aria-label="6-digit code"
      length={CODE_LENGTH}
      size="large"
      autoFocus={autoFocus}
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
