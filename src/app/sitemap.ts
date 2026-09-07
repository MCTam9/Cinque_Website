import type { MetadataRoute } from 'next';
import { sanityClient } from '@/lib/sanity/client';
import { siteUrl } from '@/lib/seo';
import { CATEGORY_PATHS, isReservedShopSlug } from '@/lib/shop/categories';
import {
  productSitemapQuery,
  collectionSitemapQuery,
  pressSitemapQuery,
  pageSitemapQuery,
} from '@/lib/sanity/queries';

/** A slug plus its last edit time, so entries can carry a real `lastModified`. */
interface SitemapDoc {
  slug: string;
  updatedAt?: string;
}

async function safeDocs(query: string): Promise<SitemapDoc[]> {
  try {
    return await sanityClient.fetch<SitemapDoc[]>(query);
  } catch (err) {
    // Matches sanityFetch's posture: degrade, but never silently. A sitemap
    // that quietly loses every product URL is indistinguishable from an empty
    // catalogue otherwise.
    console.error('[sanity] sitemap query failed — omitting those URLs', err);
    return [];
  }
}

function entry(path: string, updatedAt?: string, priority?: number): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path}`,
    ...(updatedAt ? { lastModified: new Date(updatedAt) } : {}),
    ...(priority !== undefined ? { priority } : {}),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, press, pages] = await Promise.all([
    safeDocs(productSitemapQuery),
    safeDocs(collectionSitemapQuery),
    safeDocs(pressSitemapQuery),
    safeDocs(pageSitemapQuery),
  ]);

  // `changeFrequency` is omitted throughout: Google ignores it, and a blanket
  // "weekly" on pages that change yearly is noise. `lastModified` is the signal.
  const staticRoutes: [string, number][] = [
    ['', 1],
    ['/shop', 0.9],
    ...CATEGORY_PATHS.map((p) => [p, 0.8] as [string, number]),
    ['/lookbook', 0.7],
    ['/press', 0.6],
    ['/studio', 0.7],
    ['/shipping', 0.3],
    ['/privacy', 0.2],
    ['/terms', 0.2],
    ['/accessibility', 0.2],
  ];

  return [
    ...staticRoutes.map(([path, priority]) => entry(path, undefined, priority)),
    // A product whose slug collides with a category route is unreachable —
    // emitting it would put a URL in the sitemap that resolves to a listing.
    ...products
      .filter((d) => !isReservedShopSlug(d.slug))
      .map((d) => entry(`/shop/${d.slug}`, d.updatedAt, 0.8)),
    ...collections.map((d) => entry(`/collections/${d.slug}`, d.updatedAt, 0.6)),
    ...press.map((d) => entry(`/press/${d.slug}`, d.updatedAt, 0.5)),
    // Previously missing entirely: CMS pages are in no navigation either, so
    // without this they were unreachable to crawlers.
    ...pages.map((d) => entry(`/pages/${d.slug}`, d.updatedAt, 0.5)),
  ];
}
