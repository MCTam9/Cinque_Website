import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // Explicitly allow the image optimizer so product photography stays
      // eligible for image search; a bare `allow: '/'` leaves it ambiguous
      // alongside the /_next internals.
      allow: ['/', '/_next/image'],
      // Keep the CMS, API and transactional flows out of the index. Note that
      // Disallow only stops crawling — the noindex tags on /cart and /checkout
      // are what actually keep them out of the index.
      disallow: ['/admin', '/api', '/checkout', '/cart'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
