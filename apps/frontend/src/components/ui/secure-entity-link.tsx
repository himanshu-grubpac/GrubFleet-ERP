"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { internalHref } from "@/lib/navigation/nav-path-match";
import {
  pathnameFromHref,
  prepareEntityNavigationForPath,
} from "@/lib/navigation/secure-entity-navigation";

type SecureEntityLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  entityId: string;
};

/** In-app link that primes secure entity navigation before route change. */
export function SecureEntityLink({
  href,
  entityId,
  onClick,
  scroll = false,
  ...props
}: SecureEntityLinkProps) {
  const resolvedHref = internalHref(href);

  return (
    <Link
      href={resolvedHref}
      scroll={scroll}
      onClick={(event) => {
        const trimmed = entityId.trim();
        if (trimmed) {
          prepareEntityNavigationForPath(pathnameFromHref(resolvedHref), trimmed);
        }
        onClick?.(event);
      }}
      {...props}
    />
  );
}
