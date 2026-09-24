'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-blue-100 bg-white px-4">
      <div className="flex items-center gap-2 md:hidden">
        <Button variant="ghost" size="sm" aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-semibold text-blue-950">GrubPac ERP</span>
      </div>
      <div className="hidden text-sm text-slate-600 md:block">
        Signed in as <span className="font-medium text-blue-900">placeholder@grubpac.local</span>
      </div>
      <Link
        href="/login"
        className="inline-flex h-8 items-center rounded-md border border-blue-200 px-3 text-sm font-medium text-blue-900 hover:bg-blue-50"
      >
        Switch account
      </Link>
    </header>
  );
}
