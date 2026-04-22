'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/utils/Helpers';

import { StrixBadge } from './StrixBadge';

const LINKS = [
  { href: '/strix-store', label: 'Overview' },
  { href: '/strix-store/shop', label: 'Shop' },
  { href: '/strix-store/admin', label: 'Admin' },
  { href: '/strix-store/agent', label: 'Agent console' },
  { href: '/strix-store/receipts', label: 'Receipts' },
];

export function StoreNav() {
  const pathname = usePathname();
  // next-intl may prefix the path with a locale, e.g. /fr/strix-store. Strip it
  // so highlighting is based on the route, not the locale.
  const stripped = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0b0e]/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/strix-store" className="flex items-center gap-2 font-semibold tracking-tight text-white">
          <span className="grid size-6 place-items-center rounded-md bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-black text-black">S</span>
          <span>Strix Store</span>
        </Link>
        <nav className="flex flex-1 items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = l.href === '/strix-store'
              ? stripped === '/strix-store'
              : stripped.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-md px-3 py-1.5 transition-colors',
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white',
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <StrixBadge pulse />
      </div>
    </header>
  );
}
