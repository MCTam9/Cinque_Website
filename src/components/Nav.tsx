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
    <header className="sticky top-0 z-50 border-b border-graphite bg-cararra">
      <nav className="mx-auto grid h-[70px] max-w-frame grid-cols-[1fr_auto_1fr] items-center px-5">
        {/* Logo (left) */}
        <Link href="/" aria-label="Cinque home" className="justify-self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/figma/cinque-wordmark.svg" alt="Cinque" width={165} height={45} className="h-[38px] w-auto" />
        </Link>

        {/* Links (centre, desktop) */}
        <ul className="hidden items-center gap-[30px] justify-self-center md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={linkClass(isActive(pathname, l.href))}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Cart (right, desktop) */}
        <Link href="/cart" className="type-h3 hidden justify-self-end text-graphite hover:text-redcurrent md:block">
          {cartLabel}
        </Link>

        {/* Hamburger (mobile) */}
        <button
          type="button"
          className="type-h3 justify-self-end text-graphite md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'CLOSE' : 'MENU'}
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div id="mobile-menu" className="border-t border-graphite bg-cararra md:hidden">
          <ul className="flex flex-col gap-5 px-5 py-4">
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
