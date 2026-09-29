"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type RestrictedInputKind,
  type SanitizeRestrictedInputOptions,
  restrictedInputHtmlProps,
  sanitizeRestrictedInputValue,
  shouldBlockKeyForRestrictedInput,
} from "@/lib/forms/restricted-input";
import {
  formatPhoneInputValue,
  formatPhoneOnBlur,
} from "@/lib/format/phone-format";
import type { CountryCode } from "libphonenumber-js";

export type RestrictedInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode" | "onChange"
> & {
  restrictedKind: RestrictedInputKind;
  maxLength?: number;
  /**
   * Default territory for **site/office** phones tied to address country.
   * Omit for person mobiles — international entry via `+` or calling code.
   */
  phoneDefaultCountry?: CountryCode;
  onChange: (value: string) => void;
};

export const RestrictedInput = React.forwardRef<
  HTMLInputElement,
  RestrictedInputProps
>(
  (
    {
      restrictedKind,
      maxLength,
      phoneDefaultCountry,
      className,
      value,
      onChange,
      onKeyDown,
      onPaste,
      ...props
    },
    ref,
  ) => {
    const htmlProps = restrictedInputHtmlProps(restrictedKind);
    const effectiveMaxLength = maxLength ?? htmlProps.maxLength;

    const sanitizeOptions: SanitizeRestrictedInputOptions = {
      maxLength: effectiveMaxLength,
    };

    const emitSanitized = (raw: string) => {
      let next = sanitizeRestrictedInputValue(
        restrictedKind,
        raw,
        sanitizeOptions,
      );
      if (restrictedKind === "phone") {
        next = formatPhoneInputValue(next, phoneDefaultCountry);
        if (
          effectiveMaxLength !== undefined &&
          next.length > effectiveMaxLength
        ) {
          next = next.slice(0, effectiveMaxLength);
        }
      }
      onChange(next);
    };

    return (
      <input
        ref={ref}
        {...htmlProps}
        {...props}
        maxLength={effectiveMaxLength}
        className={cn(
          "flex h-10 w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
          className,
        )}
        value={value ?? ""}
        onChange={(event) => {
          emitSanitized(event.target.value);
        }}
        onKeyDown={(event) => {
          if (
            shouldBlockKeyForRestrictedInput(restrictedKind, event, {
              maxLength: effectiveMaxLength,
            })
          ) {
            event.preventDefault();
          }
          onKeyDown?.(event);
        }}
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
        onBlur={(event) => {
          if (restrictedKind === "phone") {
            onChange(
              formatPhoneOnBlur(String(value ?? ""), phoneDefaultCountry),
            );
          }
          props.onBlur?.(event);
        }}
      />
    );
  },
);

RestrictedInput.displayName = "RestrictedInput";
