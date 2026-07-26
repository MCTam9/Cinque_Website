'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/store/cart';

const LINKS = [
  { label: 'SHOP', href: '/shop' },
  { label: 'LOOKBOOK', href: '/lookbook' },
  { label: 'PRESS', href: '/press' },
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
        {/* Rule line — inset to the 20px padding; links sit 10px above it. */}
        <div className="pointer-events-none absolute inset-x-5 top-[48px] border-b border-graphite" />

        {/* Logo — overlaps the line (reads as written on it). */}
        <Link href="/" aria-label="Cinque home" className="absolute left-5 top-[10px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma/cinque-wordmark.svg" alt="Cinque" width={165} height={45} className="h-[46px] w-auto" />
        </Link>

        {/* Links — centred on the page, evenly distributed in equal slots. The
            slot width scales with the viewport so the row clears the wordmark on
            the left and CART on the right at every width; it reaches its full
            160px (the Figma value) from 1280px up. */}
        <ul className="absolute left-1/2 top-[18px] hidden -translate-x-1/2 md:flex">
          {LINKS.map((l) => (
            <li key={l.href} className="w-[clamp(96px,12.5vw,160px)] text-center">
              <Link href={l.href} className={linkClass(isActive(pathname, l.href))}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Cart — right, aligned to the 20px padding (desktop). */}
        <Link
          href="/cart"
          className={`absolute right-5 top-[18px] hidden md:block ${linkClass(
            isActive(pathname, '/cart')
          )}`}
        >
          {cartLabel}
        </Link>

        {/* Hamburger (mobile). Offsets are pulled back by the 13px padding that
            gives the label a 44px tap target, so it still reads at right-5 /
            top-[18px] — in line with CART on desktop. */}
        <button
          type="button"
          className="type-h3 absolute right-[7px] top-[5px] p-[13px] text-graphite md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'CLOSE' : 'MENU'}
        </button>
      </div>

      {/* Mobile panel — links stacked left, CART right on the last row,
          bottom rule inset to the 20px padding. Kept mounted so it can
          animate shut as well as open (see .dropdown-panel). Three
          nested divs, each load-bearing: the outer one holds md:hidden,
          so the panel's `display: grid` can't override it and leak the
          menu onto desktop; the middle one is the clipper, kept bare so
          the collapse reaches flush zero and the closed menu adds no
          height to the header; the rule and padding ride on the list
          inside it. */}
      <div className="px-5 md:hidden">
        <div id="mobile-menu" data-open={open} className="dropdown-panel bg-cararra">
          <div>
            <ul className="flex flex-col gap-[20px] border-b border-graphite pb-[20px]">
              {LINKS.map((l, i) => (
                <li
                  key={l.href}
                  className={i === 0 ? 'flex items-center justify-between' : ''}
                >
                  <Link href={l.href} className={linkClass(isActive(pathname, l.href))}>
                    {l.label}
                  </Link>
                  {/* CART sits on the right of the first (SHOP) row, aligned with it. */}
                  {i === 0 && (
                    <Link href="/cart" className={linkClass(isActive(pathname, '/cart'))}>
                      {cartLabel}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
