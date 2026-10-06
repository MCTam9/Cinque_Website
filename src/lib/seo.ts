import type { Metadata } from 'next';
import type { ProductCategory, RingOccasion, Variant } from '@/types';
import { materialLabel, formatLabel } from '@/lib/products';
import { categoryBy } from '@/lib/shop/categories';
import { HOME_COUNTRY, SHIP_COUNTRY_CODES, shippingQuote } from '@/lib/shop/shipping';

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

/** What a ring tagged in the Studio ("Also suitable as") is called in search. */
export const RING_OCCASION_LABELS: Record<RingOccasion, string> = {
  engagement: 'Engagement Ring',
  wedding: 'Wedding Band',
};

/** The occasion nouns for a product, e.g. ["Engagement Ring", "Wedding Band"]. */
export function ringOccasionLabels(product: {
  category?: ProductCategory;
  ringOccasions?: RingOccasion[];
}): string[] {
  if (product.category !== 'rings') return [];
  return (product.ringOccasions ?? [])
    .filter((o): o is RingOccasion => o in RING_OCCASION_LABELS)
    .map((o) => RING_OCCASION_LABELS[o]);
}

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
  countries: SHIP_COUNTRY_CODES,
  handlingDaysMin: 3,
  handlingDaysMax: 5,
} as const;

/**
 * Offer shippingDetails for one item at `pricePence`: a UK entry and an
 * international entry, each with the rate checkout would charge for that item
 * alone. Mirrors /shipping, like the return policy above.
 */
export function shippingDetailsJsonLd(pricePence: number) {
  const international = SHIPPING.countries.filter((c) => c !== HOME_COUNTRY);
  const groups = [
    { countries: [HOME_COUNTRY], quote: shippingQuote(HOME_COUNTRY, pricePence) },
    { countries: international, quote: shippingQuote(international[0], pricePence) },
  ];
  return groups.map(({ countries, quote }) => ({
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: (quote.amountPence / 100).toFixed(2),
      currency: 'GBP',
    },
    shippingDestination: countries.map((c) => ({ '@type': 'DefinedRegion', addressCountry: c })),
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: SHIPPING.handlingDaysMin,
        maxValue: SHIPPING.handlingDaysMax,
        unitCode: 'DAY',
      },
    },
  }));
}

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
      'Jewellery and object maker. Individually made, cast and hallmarked in London, ' +
      'including bespoke engagement rings and wedding bands made to commission.',
    knowsAbout: [
      'Engagement rings',
      'Wedding bands',
      'Wedding rings',
      'Bespoke jewellery',
      'Lost-wax casting',
      '9ct and 18ct gold jewellery',
      'Sterling silver jewellery',
    ],
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
  ringOccasions?: RingOccasion[];
}): string {
  const name = formatLabel(product.title)
    // Drop the leading "01/" code — meaningless in a search result.
    .replace(/^\d+\//, '');
  const metal = materialLabel(product.variants?.[0]);
  // A ring tagged as a wedding band is titled as one ("… 18ct Gold Wedding
  // Band"); tagged as both, the first tag names it.
  const noun =
    ringOccasionLabels(product)[0] ??
    (product.category ? CATEGORY_SINGULAR[product.category] : undefined);
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
  ringOccasions?: RingOccasion[];
}): string {
  const occasions = ringOccasionLabels(product).map((o) => o.toLowerCase());
  // Tagged rings lead with what they are for, so the snippet carries the
  // words "engagement ring" / "wedding band" even over CMS copy that doesn't.
  const lead = occasions.length ? `${capitalise(joinAnd(occasions))}. ` : '';
  const fromCms = truncate(portableTextToPlain(product.description), 155 - lead.length);
  if (fromCms) return `${lead}${fromCms}`;

  const name = formatLabel(product.title).replace(/^\d+\//, '');
  const metal = materialLabel(product.variants?.[0]);
  const noun =
    occasions.length > 0
      ? joinOr(occasions)
      : product.category
        ? CATEGORY_SINGULAR[product.category].toLowerCase()
        : 'piece';
  const made = metal ? `Handmade ${metal.toLowerCase()} ${noun}` : `Handmade ${noun}`;
  return `${made} — ${name} by Cinque®. Individually cast and hallmarked in London.`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "engagement ring and wedding band" */
function joinAnd(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0] ?? '';
}

/** "engagement ring or wedding band" */
function joinOr(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} or ${items.at(-1)}` : items[0] ?? '';
}

export function categoryMetadata(
  value: ProductCategory,
  /** When the listing has no products, keep it out of the index: a heading and
   *  one paragraph with no items is a thin page. It stays a 200 so the URL does
   *  not churn when stock comes back. */
  { empty = false }: { empty?: boolean } = {}
): Metadata {
  const category = categoryBy(value);
  const { description } = category;
  const title = 'seoTitle' in category ? category.seoTitle : category.label;
  const path = `/shop/${value}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    ...(empty ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: `${title} — Cinque`, description, url: absoluteUrl(path) },
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
