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

const Button =
  GrubPacButton as React.ComponentType<GrubPacButtonProps>;

export default Button;