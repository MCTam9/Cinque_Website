import type { Metadata } from 'next';
import './globals.css';

// Decoupled from the full env schema (which requires Stripe/Sanity keys) so the
// marketing shell can render even before those are configured locally.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Cinque — Jewellery & Object Maker',
    template: '%s · Cinque',
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
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
