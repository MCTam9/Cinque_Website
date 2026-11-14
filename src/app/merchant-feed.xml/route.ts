import { sanityClient } from '@/lib/sanity/client';
import { merchantFeedQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import { formatLabel, materialLabel } from '@/lib/products';
import {
  BRAND_NAME,
  absoluteUrl,
  portableTextToPlain,
  productSeoDescription,
  ringOccasionLabels,
  truncate,
} from '@/lib/seo';
import { categoryBy } from '@/lib/shop/categories';
import { stoneLabel } from '@/lib/shop/materials';
import { ENGRAVING_MAX, MADE_TO_ORDER_LEAD_TIME } from '@/lib/shop/madeToOrder';
import { IN_STOCK_LEAD_TIME } from '@/lib/shop/shipping';
import type { MetalType, ProductCategory, RingOccasion, SanityImageRef, Variant } from '@/types';

/**
 * Google Merchant Center product feed: one item per variant, as RSS 2.0 with
 * the `g:` namespace. Merchant Center fetches it on a schedule, so it serves
 * free listings in Google Shopping without anyone keeping a spreadsheet.
 *
 * Shipping rates and return policies are not repeated here: they are set
 * once in the Merchant Center account, matching /shipping. Made-to-order
 * variants carry the return policy label below, which points them at the
 * account's labelled "no returns unless faulty" policy instead of the default.
 */

export const revalidate = 3600;

/** Quoted lead time for made-to-order pieces is 8–12 weeks: ready by the far end. */
const MADE_TO_ORDER_READY_WEEKS = 12;

/** Must match the label on the Merchant Center return policy for made-to-order pieces. */
const MADE_TO_ORDER_RETURN_POLICY_LABEL = 'made-to-order';

interface FeedProduct {
  _id: string;
  title: string;
  slug: string;
  status: 'active' | 'sold_out';
  category?: ProductCategory;
  edition?: string;
  ringOccasions?: RingOccasion[];
  offerEngraving?: boolean;
  description?: unknown;
  images?: SanityImageRef[];
  variants?: Variant[];
}

/** Google's own taxonomy; objects (spoons, hairpins) are left for Google to place. */
const GOOGLE_CATEGORY: Partial<Record<ProductCategory, string>> = {
  rings: 'Apparel & Accessories > Jewelry > Rings',
  earrings: 'Apparel & Accessories > Jewelry > Earrings',
  necklaces: 'Apparel & Accessories > Jewelry > Necklaces',
};

function colourOf(metal: MetalType): string | undefined {
  if (metal.endsWith('rose_gold')) return 'Rose Gold';
  if (metal.endsWith('white_gold')) return 'White Gold';
  if (metal.endsWith('gold') || metal === 'gold_vermeil') return 'Gold';
  if (metal === 'sterling_silver') return 'Silver';
  if (metal === 'platinum') return 'Platinum';
  if (metal === 'brass') return 'Brass';
  return undefined;
}

/** What the piece is, after its name: objects are named for themselves ("… Teaspoon"). */
const FEED_NOUN: Partial<Record<ProductCategory, string>> = {
  rings: 'Ring',
  earrings: 'Earrings',
  necklaces: 'Necklace',
};

/**
 * "Hand & Hand Gimmel Ring — 9ct Yellow Gold & Pearl Engagement Ring, Size N".
 * Name first, then what it is made of and what it is for: the words shoppers
 * search with. A name that already ends "in Yellow Gold" drops that phrase
 * rather than saying it twice.
 */
function feedTitle(product: FeedProduct, v: Variant, size: string | undefined): string {
  const metal = materialLabel(v)?.replace(/\s*\+\s*/g, ' & ');
  let name = formatLabel(product.title).replace(/^\d+\//, '');
  const inPhrase = name.match(/\s+in\s+(.+)$/i);
  if (inPhrase && metal?.toLowerCase().includes(inPhrase[1].toLowerCase())) {
    name = name.slice(0, inPhrase.index);
  }
  const stone = stoneLabel(v.stone?.stoneType);
  const material = [metal, stone].filter(Boolean).join(' & ');
  const noun =
    ringOccasionLabels(product)[0] ?? (product.category ? FEED_NOUN[product.category] : undefined);
  const what = [material, noun].filter(Boolean).join(' ');
  return truncate(
    [what ? `${name} — ${what}` : name, size && `Size ${size}`].filter(Boolean).join(', '),
    150
  );
}

/** Short selling points Google can show under a listing (max 10, 150 chars each). */
function highlightsFor(product: FeedProduct, v: Variant, availability: string): string[] {
  // Brass isn't a precious metal, so a piece with brass in it makes no
  // hallmark claim, even alongside silver.
  const hallmarked = !/brass/i.test(materialLabel(v) ?? '');
  const ring = product.category === 'rings';
  return [
    hallmarked ? 'Handmade, cast and hallmarked in London' : 'Handmade and cast in London',
    // Nothing about shipping on a sold-out piece.
    availability === 'out_of_stock'
      ? undefined
      : v.madeToOrder
        ? `Made to order${ring ? ' in your ring size' : ''}, ships in ${MADE_TO_ORDER_LEAD_TIME}`
        : `Ready to ship in ${IN_STOCK_LEAD_TIME}`,
    ring && v.madeToOrder && product.offerEngraving
      ? `Engraving available, up to ${ENGRAVING_MAX} characters`
      : undefined,
    product.edition
      ? `${product.edition.trim()} edition`.replace(/edition edition$/i, 'edition')
      : undefined,
  ].filter((h): h is string => Boolean(h));
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(name: string, value: string | undefined): string {
  return value ? `      <g:${name}>${escapeXml(value)}</g:${name}>` : '';
}

function availabilityOf(
  product: FeedProduct,
  v: Variant
): { availability: string; availabilityDate?: string } {
  if (product.status !== 'active') return { availability: 'out_of_stock' };
  // Made to order wins over stock, as on the product page: those variants are
  // never stock-tracked, so a leftover count means nothing.
  if (!v.madeToOrder && v.stockQuantity > 0) return { availability: 'in_stock' };
  if (v.madeToOrder || v.allowBackorder) {
    const ready = new Date(Date.now() + MADE_TO_ORDER_READY_WEEKS * 7 * 24 * 3600 * 1000);
    return { availability: 'backorder', availabilityDate: ready.toISOString() };
  }
  return { availability: 'out_of_stock' };
}

function itemsFor(product: FeedProduct): string[] {
  const variants = (product.variants ?? []).filter((v) => v.sku && v.priceGBP > 0);
  const images = (product.images ?? [])
    .filter((i) => i.asset)
    .map((img) =>
      urlFor(img as never)
        .width(1200)
        .url()
    );
  if (!variants.length || !images.length) return [];

  const link = absoluteUrl(`/shop/${product.slug}`);
  const occasions = ringOccasionLabels(product);
  const fullCopy = portableTextToPlain(product.description);
  const description = fullCopy
    ? truncate(`${occasions.length ? `${occasions.join('. ')}. ` : ''}${fullCopy}`, 5000)
    : productSeoDescription(product);
  const categoryLabel = product.category ? categoryBy(product.category).label : undefined;
  const productType = [categoryLabel, ...occasions].filter(Boolean).join(' > ');

  return variants.map((v) => {
    // Stocked ring sizes are their own variants; made-to-order ones take any size.
    const size =
      !v.madeToOrder && v.size && !/^one size$/i.test(v.size.trim()) ? v.size : undefined;
    const title = feedTitle(product, v, size);
    const { availability, availabilityDate } = availabilityOf(product, v);
    return [
      '    <item>',
      tag('id', v.sku),
      variants.length > 1 ? tag('item_group_id', product._id) : '',
      tag('title', title),
      tag('description', description),
      tag('link', link),
      tag('image_link', images[0]),
      ...images.slice(1, 11).map((src) => tag('additional_image_link', src)),
      tag('availability', availability),
      tag('availability_date', availabilityDate),
      tag('price', `${(v.priceGBP / 100).toFixed(2)} GBP`),
      tag('brand', BRAND_NAME),
      tag('condition', 'new'),
      // Handmade: no barcode or manufacturer part number exists.
      tag('identifier_exists', 'no'),
      tag('google_product_category', product.category && GOOGLE_CATEGORY[product.category]),
      tag('product_type', productType || undefined),
      tag('material', materialLabel(v)),
      tag('color', colourOf(v.metalType)),
      tag('gender', 'unisex'),
      tag('age_group', 'adult'),
      tag('size', size),
      size ? tag('size_system', 'UK') : '',
      ...highlightsFor(product, v, availability).map((h) => tag('product_highlight', h)),
      v.madeToOrder ? tag('return_policy_label', MADE_TO_ORDER_RETURN_POLICY_LABEL) : '',
      // For grouping in reports or ads later, e.g. engagement vs everything else.
      tag('custom_label_0', occasions[0]?.toLowerCase()),
      '    </item>',
    ]
      .filter(Boolean)
      .join('\n');
  });
}

export async function GET() {
  let products: FeedProduct[];
  try {
    products = await sanityClient.fetch<FeedProduct[]>(merchantFeedQuery);
  } catch (err) {
    // An empty feed would make Merchant Center delist every product; fail
    // instead so it keeps the last good fetch and retries.
    console.error('[sanity] merchant feed query failed', err);
    return new Response('Feed temporarily unavailable', { status: 503 });
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    '  <channel>',
    `    <title>${escapeXml(BRAND_NAME)}</title>`,
    `    <link>${escapeXml(absoluteUrl('/'))}</link>`,
    '    <description>Cinque products for Google Merchant Center</description>',
    ...products.flatMap(itemsFor),
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
