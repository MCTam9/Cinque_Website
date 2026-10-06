import { urlFor } from '@/lib/sanity/image';
import { materialGroupOf, sortByMaterialThenCategory, type MaterialGroup } from '@/lib/shop/materials';
import type { CardSize, MetalType, Product, ProductCardData, SanityImageRef, Variant } from '@/types';

/** Metal enum → display label (spaced). */
const METAL_LABELS: Record<Exclude<MetalType, 'custom'>, string> = {
  '9ct_gold': '9ct Gold',
  '18ct_gold': '18ct Gold',
  sterling_silver: 'Sterling Silver',
  platinum: 'Platinum',
  gold_vermeil: 'Gold Vermeil',
  brass: 'Brass',
};

export function metalLabel(metal?: MetalType): string | undefined {
  return metal && metal !== 'custom' ? METAL_LABELS[metal] : undefined;
}

/**
 * The Material to show for a variant: the typed-in text for a custom material
 * (a piece in more than one metal), otherwise the listed metal's label.
 */
export function materialLabel(
  v?: Pick<Variant, 'metalType' | 'customMaterial'>
): string | undefined {
  if (!v) return undefined;
  if (v.metalType === 'custom') return v.customMaterial?.trim() || undefined;
  return metalLabel(v.metalType);
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

export function variantIsAvailable(v: Variant): boolean {
  return v.stockQuantity > 0 || Boolean(v.allowBackorder) || Boolean(v.madeToOrder);
}

/** Drop label like "01/Metal Veil" from a collection ref. */
function dropLabel(collection?: Product['collection']): string | undefined {
  if (!collection?.title) return undefined;
  const name = collection.title.trim();
  if (collection.dropNumber) {
    return `${String(collection.dropNumber).padStart(2, '0')}/${name}`;
  }
  return name;
}

/** The variant a card represents: the first available one, else the first. */
function defaultVariantOf(product: Product): Variant | undefined {
  const variants = product.variants ?? [];
  return variants.find(variantIsAvailable) ?? variants[0];
}

/** The Shop section a product is listed under, from its default variant's metal. */
export function productMaterialGroup(product: Product): MaterialGroup {
  return materialGroupOf(defaultVariantOf(product)?.metalType);
}

/** Shop order: gold first, then silver, then other; category and A–Z within. */
export function sortProductsForShop(products: Product[]): Product[] {
  return sortByMaterialThenCategory(products, productMaterialGroup);
}

function cardSizeOf(product: Product): CardSize {
  return product.cardSize === 2 || product.cardSize === 3 ? product.cardSize : 1;
}

type Fractions = Partial<Record<'top' | 'bottom' | 'left' | 'right' | 'x' | 'y', number>>;

/**
 * The Studio hotspot as a CSS object-position within the Studio crop, so a
 * wide card's image keeps its focal point whichever way `object-cover` trims
 * it (landscape on desktop, portrait on mobile). Centre when none is set.
 */
function focalPosition(img: SanityImageRef): string {
  const hotspot = img.hotspot as Fractions | undefined;
  if (typeof hotspot?.x !== 'number' || typeof hotspot?.y !== 'number') return '50% 50%';
  const crop = (img.crop as Fractions | undefined) ?? {};
  const within = (point: number, start = 0, end = 0) => {
    const span = 1 - start - end;
    const v = span > 0 ? (point - start) / span : 0.5;
    return Math.round(Math.min(1, Math.max(0, v)) * 100);
  };
  return `${within(hotspot.x, crop.left, crop.right)}% ${within(hotspot.y, crop.top, crop.bottom)}%`;
}

/**
 * Flatten a Sanity product into presentation-ready card data (server-side, so
 * urlFor / image building never ships to the client). The default variant is
 * the first available one, falling back to the first variant.
 */
export function toCardData(product: Product): ProductCardData {
  const variants = product.variants ?? [];
  const defaultVariant = defaultVariantOf(product);
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

  // Wide cards change shape between breakpoints (landscape across two columns
  // on desktop, portrait in one on mobile), so their image is fetched at the
  // Studio crop's own aspect and trimmed in CSS around the hotspot instead of
  // being cut to 2:3 here.
  const cardSize = cardSizeOf(product);
  const wideImage = product.cardImage?.asset ? product.cardImage : firstImage;
  const wide = cardSize > 1 && wideImage?.asset;

  return {
    productId: product._id,
    slug: product.slug,
    title: formatLabel(product.title),
    imageUrl,
    imageAlt: firstImage?.alt || product.title,
    priceGBP: minPrice,
    material: materialLabel(defaultVariant),
    drop: dropLabel(product.collection),
    edition: product.edition,
    size: defaultVariant?.size,
    variantKey: defaultVariant?._key,
    sku: defaultVariant?.sku,
    inStock: defaultVariant ? variantIsAvailable(defaultVariant) : false,
    materialGroup: productMaterialGroup(product),
    cardSize,
    ...(wide
      ? {
          wideImageUrl: urlFor(wideImage as never).width(1600).url(),
          wideImagePosition: focalPosition(wideImage),
          wideImageAlt: wideImage.alt || product.title,
        }
      : {}),
  };
}
