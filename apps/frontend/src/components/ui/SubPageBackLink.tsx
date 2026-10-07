"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { internalHref } from "@/lib/navigation/nav-path-match";
import { cn } from "@/lib/utils";

type SubPageBackLinkProps = {
  href: string;
  label: string;
  className?: string;
};

/** Explicit parent navigation for dashboard sub-routes (static-export safe). */
export function SubPageBackLink({
  href,
  label,
  className,
}: SubPageBackLinkProps) {
  return (
    <Link
      href={internalHref(href)}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-[#FE5720]",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}
