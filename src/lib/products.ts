import { urlFor } from '@/lib/sanity/image';
import type { MetalType, Product, ProductCardData, Variant } from '@/types';

/** Metal enum → display label (spaced). */
const METAL_LABELS: Record<MetalType, string> = {
  '9ct_gold': '9ct Gold',
  '18ct_gold': '18ct Gold',
  sterling_silver: 'Sterling Silver',
  platinum: 'Platinum',
  gold_vermeil: 'Gold Vermeil',
  brass: 'Brass',
};

export function metalLabel(metal?: MetalType): string | undefined {
  return metal ? METAL_LABELS[metal] : undefined;
}

/**
 * Format an underscored code label for display: the leading numeric code is
 * separated with a slash, the rest with spaces.
 *   "04_Lost_Garden"     → "04/Lost Garden"
 *   "01_Lace_Fork_Pendant" → "01/Lace Fork Pendant"
 *   "Lace_Fork_Pendant"  → "Lace Fork Pendant"
 */
export function formatLabel(s?: string): string {
  if (!s) return '';
  const i = s.indexOf('_');
  if (i === -1) return s;
  const first = s.slice(0, i);
  const rest = s.slice(i + 1).replace(/_/g, ' ');
  return /^\d+$/.test(first) ? `${first}/${rest}` : `${first} ${rest}`;
}

/** "£120.00" from pence; drops the ".00" for whole pounds. */
export function formatGBP(pence: number): string {
  const pounds = pence / 100;
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}

function variantIsAvailable(v: Variant): boolean {
  return v.stockQuantity > 0 || Boolean(v.allowBackorder);
}

/** Drop label like "01/Metal Veil" from a collection ref. */
function dropLabel(collection?: Product['collection']): string | undefined {
  if (!collection?.title) return undefined;
  const name = collection.title.trim();
  if (typeof collection.dropNumber === 'number') {
    return `${String(collection.dropNumber).padStart(2, '0')}/${name}`;
  }
  return name;
}

/**
 * Flatten a Sanity product into presentation-ready card data (server-side, so
 * urlFor / image building never ships to the client). The default variant is
 * the first available one, falling back to the first variant.
 */
export function toCardData(product: Product): ProductCardData {
  const variants = product.variants ?? [];
  const defaultVariant = variants.find(variantIsAvailable) ?? variants[0];
  const minPrice = variants.length
    ? Math.min(...variants.map((v) => v.priceGBP))
    : (defaultVariant?.priceGBP ?? 0);

  const firstImage = product.images?.[0];
  const imageUrl = firstImage?.asset
    ? urlFor(firstImage as never)
        .width(616)
        .height(924)
        .fit('crop')
        .url()
    : undefined;

  return {
    productId: product._id,
    slug: product.slug,
    title: formatLabel(product.title),
    imageUrl,
    imageAlt: firstImage?.alt || product.title,
    priceGBP: minPrice,
    material: metalLabel(defaultVariant?.metalType),
    drop: dropLabel(product.collection),
    edition: product.edition,
    size: defaultVariant?.size,
    variantKey: defaultVariant?._key,
    sku: defaultVariant?.sku,
    inStock: defaultVariant ? variantIsAvailable(defaultVariant) : false,
  };
}
