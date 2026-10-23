"use client";

import * as React from "react";
import { sanitizeTextValue } from "@/lib/forms/restricted-input";

export type RestrictedTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> & {
  onChange: (value: string) => void;
};

export const RestrictedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  RestrictedTextareaProps
>(({ maxLength, value, onChange, onPaste, ...props }, ref) => {
  const emitSanitized = (raw: string) => {
    onChange(sanitizeTextValue(raw, maxLength));
  };

  return (
    <textarea
      ref={ref}
      {...props}
      maxLength={maxLength}
      value={value ?? ""}
      onChange={(event) => emitSanitized(event.target.value)}
      onPaste={(event) => {
        event.preventDefault();
        const pasted = event.clipboardData.getData("text");
        const input = event.currentTarget;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const merged =
          input.value.slice(0, start) + pasted + input.value.slice(end);
        emitSanitized(merged);
        onPaste?.(event);
      }}
    />
  );
});

RestrictedTextarea.displayName = "RestrictedTextarea";
