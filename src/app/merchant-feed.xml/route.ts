import { sanityClient } from '@/lib/sanity/client';
import { merchantFeedQuery } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image';
import { materialLabel } from '@/lib/products';
import {
  BRAND_NAME,
  absoluteUrl,
  portableTextToPlain,
  productSeoDescription,
  productSeoTitle,
  ringOccasionLabels,
  truncate,
} from '@/lib/seo';
import { categoryBy } from '@/lib/shop/categories';
import type { MetalType, ProductCategory, RingOccasion, SanityImageRef, Variant } from '@/types';

/**
 * Google Merchant Center product feed: one item per variant, as RSS 2.0 with
 * the `g:` namespace. Merchant Center fetches it on a schedule, so it serves
 * free listings in Google Shopping without anyone keeping a spreadsheet.
 *
 * Shipping rates and the return policy are not repeated here: they are set
 * once in the Merchant Center account, matching /shipping.
 */

export const revalidate = 3600;

/** Quoted lead time for made-to-order pieces is 8–12 weeks: ready by the far end. */
const MADE_TO_ORDER_READY_WEEKS = 12;

interface FeedProduct {
  _id: string;
  title: string;
  slug: string;
  status: 'active' | 'sold_out';
  category?: ProductCategory;
  ringOccasions?: RingOccasion[];
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
    .map((img) => urlFor(img as never).width(1200).url());
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
    const title = truncate(
      [productSeoTitle({ ...product, variants: [v] }), size && `Size ${size}`]
        .filter(Boolean)
        .join(', '),
      150
    );
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
