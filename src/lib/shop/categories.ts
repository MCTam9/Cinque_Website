import type { ProductCategory } from '@/types';

/**
 * The Shop category set — the single source of truth.
 *
 * Kept dependency-free (no `next/*`, no Sanity imports) so both the storefront
 * routes and the Sanity schema's slug validation can import it without dragging
 * server-only code into the Studio bundle.
 *
 * Each category is a real, crawlable route at /shop/<value>. Those are literal
 * path segments, so they take routing precedence over /shop/[slug] — which is
 * why `isReservedShopSlug` exists: a product slug matching one of these would be
 * permanently unreachable, so we reject it at authoring time instead.
 */
export const SHOP_CATEGORIES = [
  {
    value: 'rings',
    label: 'Rings',
    // Written per category rather than templated: four listing pages that
    // differ only by a substituted noun read as duplicate content.
    description:
      'Handmade rings in sterling silver, 9ct and 18ct gold. Individually cast, ' +
      'finished and hallmarked in London, with bespoke and engagement commissions.',
  },
  {
    value: 'earrings',
    label: 'Earrings',
    description:
      'Sculptural earrings cast by hand in London. Sterling silver, gold vermeil ' +
      'and carat gold, made in small editions and one-of-a-kind pieces.',
  },
  {
    value: 'necklaces',
    label: 'Necklaces',
    description:
      'Pendants and chains cast from found forms and natural relics. Individually ' +
      'made and hallmarked in London in sterling silver and carat gold.',
  },
  {
    value: 'objects',
    label: 'Objects',
    description:
      'Cast metal objects beyond jewellery — small sculptural works from the Cinque ' +
      'studio archive, individually made in London.',
  },
] as const satisfies readonly {
  value: ProductCategory;
  label: string;
  description: string;
}[];

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

/** Route paths for every category, e.g. ['/shop/rings', …]. */
export const CATEGORY_PATHS = SHOP_CATEGORIES.map((c) => `/shop/${c.value}`);

const RESERVED = new Set<string>(SHOP_CATEGORIES.map((c) => c.value));

/**
 * True when a product slug would collide with a category route. A product with
 * slug "rings" would be shadowed by /shop/rings and never render.
 */
export function isReservedShopSlug(slug: string): boolean {
  return RESERVED.has(slug.toLowerCase());
}

export function categoryBy(value: ProductCategory): ShopCategory {
  const found = SHOP_CATEGORIES.find((c) => c.value === value);
  if (!found) throw new Error(`Unknown shop category: ${value}`);
  return found;
}
