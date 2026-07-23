import Link from 'next/link';

const LEGAL = [
  { label: 'Shipping & Returns', href: '/shipping' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Accessibility Statement', href: '/accessibility' },
] as const;

const INSTAGRAM = 'https://www.instagram.com/cinque.made';

/**
 * Trimmed footer (per review): connect + legal + brand line. No sitemap mirror
 * of the top nav. Desktop = single row; mobile = 2-column grid.
 */
export default function Footer() {
  return (
    <footer className="mt-24 border-t border-oslo/40 bg-cararra">
      <div className="mx-auto max-w-frame px-5 md:px-6 py-10">
        <div className="grid grid-cols-2 gap-8 md:flex md:justify-between">
          {/* Connect */}
          <nav aria-label="Connect" className="flex flex-col gap-2">
            <Link href="/contact" className="type-p1 hover:text-redcurrent">
              Contact
            </Link>
            <a
              href={INSTAGRAM}
              target="_blank"
              rel="noopener noreferrer"
              className="type-p1 hover:text-redcurrent"
            >
              Instagram
            </a>
          </nav>

          {/* Legal */}
          <nav aria-label="Legal" className="flex flex-col gap-2">
            {LEGAL.map((l) => (
              <Link key={l.href} href={l.href} className="type-p1 hover:text-redcurrent">
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Brand */}
          <div className="col-span-2 flex flex-col gap-1 md:items-end md:text-right">
            <span className="type-p1 font-bold">Cinque®</span>
            <span className="type-p2 text-oslo">
              Individually made, cast and hallmarked in London.
            </span>
            <span className="type-p2 text-oslo">Handcrafted by Cinque. © 2026</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
