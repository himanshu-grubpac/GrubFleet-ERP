'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

import { internalHref } from '@/lib/navigation/nav-path-match';

type DashboardNavLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
};

/** Dashboard / portal in-app navigation — trailingSlash-aware for static export. */
export function DashboardNavLink({
  href,
  scroll = false,
  ...props
}: DashboardNavLinkProps) {
  return <Link href={internalHref(href)} scroll={scroll} {...props} />;
}
