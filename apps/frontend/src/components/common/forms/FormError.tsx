"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FormErrorProps = HTMLAttributes<HTMLParagraphElement> & {
    message?: string | null;
};

export default function FormError({
    message,
    className,
    ...props
}: FormErrorProps) {
    if (!message) return null;

    return (
        <p
            role="alert"
            className={cn(
                "mt-1 text-xs leading-4 text-red-500",
                className,
            )}
            {...props}
        >
            {message}
        </p>
    );
}