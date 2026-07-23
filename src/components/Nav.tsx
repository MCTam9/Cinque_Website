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

const linkClass = (active: boolean) =>
  `type-h3 transition-colors ${
    active
      ? 'text-redcurrent font-bold underline underline-offset-4'
      : 'text-graphite hover:text-redcurrent'
  }`;

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const count = useCart((s) => s.itemCount());
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);

  const cartLabel = `CART (${mounted ? count : 0})`;

  return (
    <header className="sticky top-0 z-50 bg-cararra">
      <div className="relative mx-auto h-[70px] max-w-frame px-5">
        {/* Rule line — inset to the 20px padding, at the link baseline. */}
        <div className="pointer-events-none absolute inset-x-5 top-[48px] border-b border-graphite" />

        {/* Logo — overlaps the line (reads as written on it). */}
        <Link href="/" aria-label="Cinque home" className="absolute left-5 top-[13px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma/cinque-wordmark.svg" alt="Cinque" width={165} height={45} className="h-[42px] w-auto" />
        </Link>

        {/* Links — centred, baseline on the line (desktop). */}
        <ul className="absolute left-1/2 top-[32px] hidden -translate-x-1/2 md:flex">
          {LINKS.map((l) => (
            <li key={l.href} className="w-[150px]">
              <Link href={l.href} className={linkClass(isActive(pathname, l.href))}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Cart — right, aligned to the 20px padding (desktop). */}
        <Link
          href="/cart"
          className="type-h3 absolute right-5 top-[32px] hidden text-graphite hover:text-redcurrent md:block"
        >
          {cartLabel}
        </Link>

        {/* Hamburger (mobile). */}
        <button
          type="button"
          className="type-h3 absolute right-5 top-[32px] text-graphite md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'CLOSE' : 'MENU'}
        </button>
      </div>

      {/* Mobile panel */}
      {open && (
        <div id="mobile-menu" className="border-t border-graphite bg-cararra md:hidden">
          <ul className="flex flex-col gap-[20px] px-5 py-4">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass(isActive(pathname, l.href))}>
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
