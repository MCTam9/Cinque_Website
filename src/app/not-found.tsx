import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import SiteNotFound from './(site)/not-found';

/**
 * Root 404 for unmatched URLs. These don't belong to the (site) route group, so
 * they don't get its Nav/Footer — this file adds the same chrome around the
 * shared 404 body so a mistyped URL still lands on a branded page with a way
 * back. `notFound()` thrown inside (site) pages renders (site)/not-found.tsx on
 * its own, already inside the layout's chrome.
 */
export default function GlobalNotFound() {
  return (
    <>
      <Nav />
      <main className="min-h-screen">
        <SiteNotFound />
      </main>
      <Footer />
    </>
  );
}
