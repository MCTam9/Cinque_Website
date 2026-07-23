import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Keep the CMS, API and transactional flows out of the index.
      disallow: ['/admin', '/api', '/checkout', '/cart'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
