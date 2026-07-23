import { urlFor } from '@/lib/sanity/image';
import type { MetalType, Product, ProductCardData, Variant } from '@/types';

/** Metal enum → brand-style display label (underscore-joined, per Figma). */
const METAL_LABELS: Record<MetalType, string> = {
  '9ct_gold': '9ct_Gold',
  '18ct_gold': '18ct_Gold',
  sterling_silver: 'Sterling_Silver',
  platinum: 'Platinum',
  gold_vermeil: 'Gold_Vermeil',
  brass: 'Brass',
};

export function metalLabel(metal?: MetalType): string | undefined {
  return metal ? METAL_LABELS[metal] : undefined;
}

/** "£120.00" from pence; drops the ".00" for whole pounds. */
export function formatGBP(pence: number): string {
  const pounds = pence / 100;
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}

function variantIsAvailable(v: Variant): boolean {
  return v.stockQuantity > 0 || Boolean(v.allowBackorder);
}

/** Drop label like "01_Metal_Veil" from a collection ref. */
function dropLabel(collection?: Product['collection']): string | undefined {
  if (!collection?.title) return undefined;
  const name = collection.title.trim().replace(/\s+/g, '_');
  if (typeof collection.dropNumber === 'number') {
    return `${String(collection.dropNumber).padStart(2, '0')}_${name}`;
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
    title: product.title,
    imageUrl,
    imageAlt: firstImage?.alt || product.title,
    priceGBP: minPrice,
    material: metalLabel(defaultVariant?.metalType),
    drop: dropLabel(product.collection),
    size: defaultVariant?.size,
    variantKey: defaultVariant?._key,
    sku: defaultVariant?.sku,
    inStock: defaultVariant ? variantIsAvailable(defaultVariant) : false,
  };
}
