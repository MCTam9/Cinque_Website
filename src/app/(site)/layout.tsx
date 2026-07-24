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
      <Nav />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <ImageColorReveal />
    </>
  );
}
