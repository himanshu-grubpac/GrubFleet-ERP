"use client";

import React from "react";
import {
  Button as GrubPacButton,
  type ButtonProps,
} from "@grubpac/ui-kit";

type GrubPacButtonProps = ButtonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  };

/** Primary CTA disabled state — ui-kit primary variant has no disabled background override. */
const PRIMARY_DISABLED_CLASSES =
  "disabled:cursor-not-allowed disabled:!bg-slate-300 disabled:!border-slate-300 disabled:!text-slate-500 disabled:hover:!bg-slate-300 disabled:hover:!border-slate-300";

const UiKitButton =
  GrubPacButton as React.ComponentType<GrubPacButtonProps>;

function GrubpacButton({
  variant = "primary",
  className = "",
  ...props
}: GrubPacButtonProps) {
  const disabledVisual =
    variant === "primary" ? PRIMARY_DISABLED_CLASSES : "";

  return (
    <UiKitButton
      variant={variant}
      className={[disabledVisual, className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export default GrubpacButton;
