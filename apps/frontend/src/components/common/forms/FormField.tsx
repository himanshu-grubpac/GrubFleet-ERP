"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import FormError from "./FormError";

type FormFieldProps = {
    label: string;
    children: ReactNode;
    error?: string;
    required?: boolean;
    htmlFor?: string;
    className?: string;
    labelClassName?: string;
};

export default function FormField({
    label,
    children,
    error,
    required = false,
    htmlFor,
    className,
    labelClassName,
}: FormFieldProps) {
    return (
        <div className={cn("min-w-0", className)}>
            <label
                htmlFor={htmlFor}
                className={cn(
                    "mb-1.5 block text-sm font-medium text-gray-700",
                    labelClassName,
                )}
            >
                {label}
                {required && (
                    <span
                        aria-hidden="true"
                        className="ml-1 text-red-500"
                    >
                        *
                    </span>
                )}
            </label>

            {children}

            <FormError message={error} />
        </div>
    );
}