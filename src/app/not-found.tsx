import Link from 'next/link';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Container from '@/components/Container';
import { H1, P1 } from '@/components/typography';

const btn =
  'type-p1 inline-block border border-graphite px-6 py-3 transition-colors hover:bg-graphite hover:text-cararra';

/**
 * Root 404 for unmatched URLs (which don't belong to the (site) route group and
 * so wouldn't otherwise get its Nav/Footer). Renders the same chrome as the site
 * layout so a mistyped URL still lands on a branded page with a way back.
 * `notFound()` thrown inside (site) pages uses (site)/not-found.tsx instead.
 */
export default function GlobalNotFound() {
  return (
    <>
      <Nav />
      <main className="min-h-screen">
        <Container className="py-[60px] md:py-[80px]">
          <H1 className="mb-5">Page not found</H1>
          <P1 className="mb-8 text-oslo">
            The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
          </P1>
          <div className="flex flex-wrap gap-[10px]">
            <Link href="/" className={btn}>
              Home
            </Link>
            <Link href="/shop" className={btn}>
              Shop
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
