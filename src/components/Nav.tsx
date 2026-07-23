'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/store/cart';

const LINKS = [
  { label: 'SHOP', href: '/shop' },
  { label: 'LOOKBOOK', href: '/lookbook' },
  { label: 'EXHIBITION', href: '/exhibitions' },
  { label: 'STUDIO', href: '/studio' },
] as const;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Cart count is client-only (persisted in localStorage) — defer to after
  // mount to avoid an SSR/hydration mismatch.
  const [mounted, setMounted] = useState(false);
  const count = useCart((s) => s.itemCount());
  useEffect(() => setMounted(true), []);

  // Close the mobile panel on route change.
  useEffect(() => setOpen(false), [pathname]);

  const cartLabel = `CART (${mounted ? count : 0})`;

  return (
    <header className="sticky top-0 z-50 bg-cararra border-b border-oslo/40">
      <nav className="mx-auto max-w-frame px-5 md:px-6 h-[70px] flex items-center justify-between">
        {/* Wordmark → home */}
        <Link href="/" className="type-h3 font-bold tracking-tight" aria-label="Cinque home">
          Cinque®
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`type-h3 transition-colors ${
                  isActive(pathname, l.href)
                    ? 'text-redcurrent font-bold underline underline-offset-4'
                    : 'text-graphite hover:text-redcurrent'
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/cart" className="type-h3 text-graphite hover:text-redcurrent">
              {cartLabel}
            </Link>
          </li>
        </ul>

        {/* Mobile: hamburger */}
        <button
          type="button"
          className="md:hidden type-h3 text-graphite"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'CLOSE' : 'MENU'}
        </button>
      </nav>

      {/* Mobile expanded panel */}
      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-oslo/40 bg-cararra">
          <ul className="px-5 py-4 flex flex-col gap-4">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`type-h3 ${
                    isActive(pathname, l.href)
                      ? 'text-redcurrent font-bold underline underline-offset-4'
                      : 'text-graphite'
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/cart" className="type-h3 text-graphite">
                {cartLabel}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
