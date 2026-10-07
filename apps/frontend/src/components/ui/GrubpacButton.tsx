"use client";

import React from "react";
import {
  Button as GrubPacButton,
  type ButtonProps,
} from "@grubpac/ui-kit";

import { cn } from "@/lib/utils";

type GrubPacButtonProps = ButtonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  };

/** Brand primary must read as disabled (slate), not orange, when non-actionable. */
const PRIMARY_DISABLED_CLASSES =
  "disabled:!cursor-not-allowed disabled:!pointer-events-none disabled:!bg-slate-200 disabled:!text-slate-500 disabled:!border-slate-200 disabled:!opacity-100 disabled:hover:!bg-slate-200 disabled:hover:!text-slate-500 disabled:shadow-none";

const UiKitButton =
  GrubPacButton as React.ComponentType<GrubPacButtonProps>;

function isPrimaryVariant(variant: ButtonProps["variant"]): boolean {
  return variant === undefined || variant === "primary";
}

export default function GrubpacButton({
  className,
  variant,
  disabled,
  ...props
}: GrubPacButtonProps) {
  return (
    <UiKitButton
      variant={variant}
      disabled={disabled}
      className={cn(
        isPrimaryVariant(variant) && disabled && PRIMARY_DISABLED_CLASSES,
        className,
      )}
      {...props}
    />
  );
}
