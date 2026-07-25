import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Self-hosted licensed font (files in src/fonts). Exposes the CSS variable
// `--font-letter-gothic`, which Tailwind's font-sans/mono reference.
const letterGothic = localFont({
  src: [
    { path: '../fonts/LetterGothicStd.otf', weight: '400', style: 'normal' },
    { path: '../fonts/LetterGothicStd-Bold.otf', weight: '700', style: 'normal' },
    { path: '../fonts/LetterGothicStd-Slanted.otf', weight: '400', style: 'italic' },
  ],
  variable: '--font-letter-gothic',
  display: 'swap',
  fallback: ['ui-monospace', 'Courier New', 'monospace'],
});

// Decoupled from the full env schema (which requires Stripe/Sanity keys) so the
// marketing shell can render even before those are configured locally.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Cinque / Jewellery Studio',
    template: '%s / Cinque',
  },
  description:
    'Cinque® — jewellery and object maker. Sealing memories into a tactile archive. Individually made, cast and hallmarked in London.',
  applicationName: 'Cinque',
  openGraph: {
    type: 'website',
    siteName: 'Cinque',
    title: 'Cinque — Jewellery & Object Maker',
    description:
      'Individually made, cast and hallmarked in London. Sealing memories into a tactile archive.',
    url: siteUrl,
    locale: 'en_GB',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cinque — Jewellery & Object Maker',
    description: 'Individually made, cast and hallmarked in London.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={letterGothic.variable}>
      <body>{children}</body>
    </html>
  );
}
