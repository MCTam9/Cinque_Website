import type { MetadataRoute } from 'next';
import { sanityClient } from '@/lib/sanity/client';
import {
  productSlugsQuery,
  collectionSlugsQuery,
  exhibitionSlugsQuery,
} from '@/lib/sanity/queries';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function safeSlugs(query: string): Promise<string[]> {
  try {
    return await sanityClient.fetch<string[]>(query);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, exhibitions] = await Promise.all([
    safeSlugs(productSlugsQuery),
    safeSlugs(collectionSlugsQuery),
    safeSlugs(exhibitionSlugsQuery),
  ]);

  const staticRoutes = [
    '',
    '/shop',
    '/lookbook',
    '/exhibitions',
    '/studio',
    '/contact',
    '/shipping',
    '/privacy',
    '/terms',
    '/accessibility',
  ];

  const entries: MetadataRoute.Sitemap = [
    ...staticRoutes.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: 'weekly' as const })),
    ...products.map((slug) => ({ url: `${siteUrl}/shop/${slug}` })),
    ...collections.map((slug) => ({ url: `${siteUrl}/collections/${slug}` })),
    ...exhibitions.map((slug) => ({ url: `${siteUrl}/exhibitions/${slug}` })),
  ];

  return entries;
}
