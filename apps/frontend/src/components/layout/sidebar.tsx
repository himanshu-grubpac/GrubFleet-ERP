'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mainNavItems, filterNavByPermissions } from '@/lib/navigation/modules';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const items = filterNavByPermissions(mainNavItems, null);

  return (
    <aside className="hidden w-64 shrink-0 border-r border-blue-100 bg-white md:flex md:flex-col">
      <div className="border-b border-blue-100 px-4 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">GrubPac</p>
        <h1 className="text-lg font-bold text-blue-950">ERP Platform</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3" aria-label="Main">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-900 hover:bg-blue-50',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
