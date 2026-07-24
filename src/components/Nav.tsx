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
      <div className="relative h-[70px] px-5">
        {/* Rule line — inset to the 20px padding; links sit 10px above it. */}
        <div className="pointer-events-none absolute inset-x-5 top-[48px] border-b border-graphite" />

        {/* Logo — overlaps the line (reads as written on it). */}
        <Link href="/" aria-label="Cinque home" className="absolute left-5 top-[10px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma/cinque-wordmark.svg" alt="Cinque" width={165} height={45} className="h-[46px] w-auto" />
        </Link>

        {/* Links — centred on the page, evenly distributed in equal slots. */}
        <ul className="absolute left-1/2 top-[18px] hidden -translate-x-1/2 md:flex">
          {LINKS.map((l) => (
            <li key={l.href} className="w-[160px] text-center">
              <Link href={l.href} className={linkClass(isActive(pathname, l.href))}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Cart — right, aligned to the 20px padding (desktop). */}
        <Link
          href="/cart"
          className="type-h3 absolute right-5 top-[18px] hidden text-graphite hover:text-redcurrent md:block"
        >
          {cartLabel}
        </Link>

        {/* Hamburger (mobile). */}
        <button
          type="button"
          className="type-h3 absolute right-5 top-[18px] text-graphite md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'CLOSE' : 'MENU'}
        </button>
      </div>

      {/* Mobile panel — links stacked left, CART right on the last row,
          bottom rule inset to the 20px padding. */}
      {open && (
        <div id="mobile-menu" className="animate-dropdown bg-cararra px-5 md:hidden">
          <ul className="flex flex-col gap-[20px] border-b border-graphite pb-[20px]">
            {LINKS.map((l, i) => (
              <li
                key={l.href}
                className={i === LINKS.length - 1 ? 'flex items-center justify-between' : ''}
              >
                <Link href={l.href} className={linkClass(isActive(pathname, l.href))}>
                  {l.label}
                </Link>
                {i === LINKS.length - 1 && (
                  <Link href="/cart" className="type-h3 text-graphite hover:text-redcurrent">
                    {cartLabel}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
