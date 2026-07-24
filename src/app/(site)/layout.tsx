import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ImageColorReveal from '@/components/ImageColorReveal';

/**
 * Shared chrome for all public marketing/shop pages. Sanity Studio (/admin)
 * and API routes sit outside this group so they stay clean.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Skip link — hidden until keyboard-focused, then jumps past the nav. */}
      <a
        href="#main-content"
        className="sr-only type-p1 focus:not-sr-only focus:fixed focus:left-[10px] focus:top-[10px] focus:z-[100] focus:bg-graphite focus:px-4 focus:py-2 focus:text-cararra"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main-content" className="min-h-screen">
        {children}
      </main>
      <Footer />
      <ImageColorReveal />
    </>
  );
}
