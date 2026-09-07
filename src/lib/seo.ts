import type { Metadata } from 'next';
import type { ProductCategory, Variant } from '@/types';
import { metalLabel, formatLabel } from '@/lib/products';
import { categoryBy } from '@/lib/shop/categories';

/**
 * Canonical site URL. Previously copy-pasted into five files; import it from
 * here instead. Deliberately decoupled from the full env schema (which requires
 * Stripe/Sanity keys) so metadata still resolves before those are configured.
 */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/** Absolute URL for a site-relative path. */
export function absoluteUrl(path = '/'): string {
  return new URL(path, siteUrl).toString();
}

/** Singular category noun, for product titles ("… Sterling Silver Ring"). */
const CATEGORY_SINGULAR: Record<ProductCategory, string> = {
  rings: 'Ring',
  earrings: 'Earrings',
  necklaces: 'Necklace',
  objects: 'Object',
};

/**
 * Shipping and returns terms, mirrored into Product structured data.
 *
 * These MUST stay in step with the published copy at /shipping — Google treats
 * a mismatch between marked-up policy and stated policy as a merchant listing
 * violation. That page is the human-readable source; this is the machine copy.
 */
export const RETURN_POLICY = {
  /** UK Consumer Contracts Regulations cancellation window. */
  days: 14,
  country: 'GB',
  /** Return postage is the customer's responsibility unless the item is faulty. */
  returnFeesCustomerResponsibility: true,
} as const;

export const SHIPPING = {
  countries: ['GB', 'US', 'FR', 'DE', 'IE'],
  handlingDaysMin: 3,
  handlingDaysMax: 5,
} as const;

/** Ordered trail → BreadcrumbList JSON-LD. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** The brand, described once. Reused by Organization and as JSON-LD `brand`. */
export const BRAND_NAME = 'Cinque';
export const INSTAGRAM_URL = 'https://www.instagram.com/cinque.made';

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteUrl('/#organization'),
    name: BRAND_NAME,
    url: siteUrl,
    logo: absoluteUrl('/figma/cinque-logo.png'),
    description:
      'Jewellery and object maker. Individually made, cast and hallmarked in London.',
    sameAs: [INSTAGRAM_URL],
  };
}

/**
 * Search title for a product.
 *
 * Product titles are stored as brand-style codes ("01_Lace_Fork_Pendant") and
 * render as "01/Lace Fork Pendant" on the page. That is deliberate brand
 * styling, but as a <title> it carries no keywords at all — nothing says what
 * the piece is or what it is made from. So the display title stays untouched
 * and the search title is enriched from data already on the variants.
 */
export function productSeoTitle(product: {
  title: string;
  category?: ProductCategory;
  variants?: Variant[];
}): string {
  const name = formatLabel(product.title)
    // Drop the leading "01/" code — meaningless in a search result.
    .replace(/^\d+\//, '');
  const metal = metalLabel(product.variants?.[0]?.metalType);
  const noun = product.category ? CATEGORY_SINGULAR[product.category] : undefined;
  const qualifier = [metal, noun].filter(Boolean).join(' ');
  return qualifier ? `${name} — ${qualifier}` : name;
}

/**
 * Search description for a product. Prefers real editorial copy from the CMS
 * `description` field; falls back to a composed sentence only when it is empty.
 * Without this every product in the catalogue shipped an identical description.
 */
export function productSeoDescription(product: {
  title: string;
  category?: ProductCategory;
  description?: unknown;
  variants?: Variant[];
}): string {
  const fromCms = truncate(portableTextToPlain(product.description), 155);
  if (fromCms) return fromCms;

  const name = formatLabel(product.title).replace(/^\d+\//, '');
  const metal = metalLabel(product.variants?.[0]?.metalType);
  const noun = product.category ? CATEGORY_SINGULAR[product.category].toLowerCase() : 'piece';
  const made = metal ? `Handmade ${metal.toLowerCase()} ${noun}` : `Handmade ${noun}`;
  return `${made} — ${name} by Cinque®. Individually cast and hallmarked in London.`;
}

export function categoryMetadata(
  value: ProductCategory,
  /** When the listing has no products, keep it out of the index: a heading and
   *  one paragraph with no items is a thin page. It stays a 200 so the URL does
   *  not churn when stock comes back. */
  { empty = false }: { empty?: boolean } = {}
): Metadata {
  const { label, description } = categoryBy(value);
  const path = `/shop/${value}`;
  return {
    title: label,
    description,
    alternates: { canonical: path },
    ...(empty ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: `${label} — Cinque`, description, url: absoluteUrl(path) },
  };
}

/**
 * Flatten Portable Text to plain text. Only walks `block` nodes' span children,
 * which is all the meta description needs — images and custom blocks contribute
 * no prose.
 */
export function portableTextToPlain(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value
    .filter((b): b is { _type?: string; children?: unknown[] } =>
      Boolean(b) && typeof b === 'object'
    )
    .filter((b) => b._type === 'block' && Array.isArray(b.children))
    .map((b) =>
      (b.children as { text?: unknown }[])
        .map((c) => (typeof c?.text === 'string' ? c.text : ''))
        .join('')
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Truncate on a word boundary, appending an ellipsis only if text was cut. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}
