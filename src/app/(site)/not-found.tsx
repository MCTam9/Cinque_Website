import Link from 'next/link';
import Container from '@/components/Container';
import { H1, P1 } from '@/components/typography';

/**
 * 404 for `notFound()` thrown inside (site) pages — an unknown product, press,
 * collection or CMS page slug. Content only: the (site) layout already provides
 * the Nav and Footer. src/app/not-found.tsx reuses this same body and adds the
 * chrome itself, for URLs that never reach the route group.
 */
export default function SiteNotFound() {
  return (
    <Container className="py-[60px] md:py-[80px]">
      <H1 className="mb-[20px]">Page not found</H1>
      <P1 className="mb-[30px] text-oslo">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
      </P1>
      <div className="flex flex-wrap gap-[10px]">
        <Link href="/" className="btn">
          Home
        </Link>
        <Link href="/shop" className="btn">
          Shop
        </Link>
      </div>
    </Container>
  );
}
