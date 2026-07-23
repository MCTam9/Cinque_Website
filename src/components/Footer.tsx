import Link from 'next/link';

const LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: 'Contact', href: '/contact' },
  { label: 'Instagram', href: 'https://www.instagram.com/cinque.made', external: true },
  { label: 'Shipping & Returns', href: '/shipping' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Accessibility Statement', href: '/accessibility' },
];

/**
 * Footer (Figma "Footer"): a single row of six links, the copyright line, and
 * the hallmark mark at the far right. The rule + all content sit inside the
 * 20px page padding. Desktop = 6-column row; mobile = 2-column.
 */
export default function Footer() {
  return (
    <footer className="mt-[80px] bg-cararra">
      <div className="px-5">
        <div className="border-t border-graphite pt-[10px] pb-[30px]">
          <ul className="grid grid-cols-2 gap-x-[10px] gap-y-[20px] md:flex md:justify-between md:gap-0">
            {LINKS.map((l) => (
              <li key={l.href}>
                {l.external ? (
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="type-p1 hover:text-redcurrent"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className="type-p1 hover:text-redcurrent">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-[40px] flex items-end justify-between">
            <span className="type-p2 text-oslo">Handcrafted by Cinque. © 2026</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/hallmark.png"
              alt="Cinque hallmark"
              width={81}
              height={15}
              className="h-[15px] w-auto opacity-80"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
