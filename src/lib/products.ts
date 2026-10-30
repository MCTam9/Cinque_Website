import { urlFor } from '@/lib/sanity/image';
import {
  materialGroupOf,
  sortByMaterialThenCategory,
  stoneLabel,
  type MaterialGroup,
} from '@/lib/shop/materials';
import type { CardSize, MetalType, Product, ProductCardData, SanityImageRef, Variant } from '@/types';

/** Metal enum → display label (spaced). */
const METAL_LABELS: Record<Exclude<MetalType, 'custom'>, string> = {
  '9ct_gold': '9ct Yellow Gold',
  '9ct_rose_gold': '9ct Rose Gold',
  '9ct_white_gold': '9ct White Gold',
  '14ct_gold': '14ct Yellow Gold',
  '14ct_rose_gold': '14ct Rose Gold',
  '14ct_white_gold': '14ct White Gold',
  '18ct_gold': '18ct Yellow Gold',
  '18ct_rose_gold': '18ct Rose Gold',
  '18ct_white_gold': '18ct White Gold',
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

/** Every material a product comes in, in variant order, e.g. ["9ct Gold", "14ct Gold"]. */
export function materialsOf(
  variants?: Pick<Variant, 'metalType' | 'customMaterial'>[] | null
): string[] {
  return [
    ...new Set(
      (variants ?? []).map((v) => materialLabel(v)).filter((m): m is string => Boolean(m))
    ),
  ];
}

const GOLD_LABEL = /^(\d+ct) (Yellow|Rose|White) Gold$/;
const GOLD_COLOURS = ['Yellow', 'Rose', 'White'];

/**
 * A product's materials in one short phrase, for the card's Material row:
 * golds sharing a colour or a carat are grouped, so it reads
 * "9ct / 14ct Yellow Gold" rather than "9ct Yellow Gold / 14ct Yellow Gold".
 *
 *   • every carat in every colour: "14ct Yellow / Rose Gold", "9ct / 18ct Yellow / White Gold"
 *   • otherwise one group per colour: "9ct / 14ct Yellow Gold, 18ct Rose Gold"
 *
 * Carats run low to high, colours yellow, rose, white. Anything that isn't a
 * coloured gold (silver, a custom material) keeps its own label, in variant
 * order, and the groups are joined with commas. Stones come last, once each,
 * since the metal is what changes between variants: "9ct / 14ct Yellow Gold, Pearl".
 */
export function materialsSummary(
  variants?: Pick<Variant, 'metalType' | 'customMaterial' | 'stone'>[] | null
): string | undefined {
  const labels = materialsOf(variants);
  const golds = labels.flatMap((l) => {
    const m = GOLD_LABEL.exec(l);
    return m ? [{ carat: m[1], colour: m[2] }] : [];
  });
  const carats = [...new Set(golds.map((g) => g.carat))].sort((a, b) => parseInt(a) - parseInt(b));
  const colours = GOLD_COLOURS.filter((c) => golds.some((g) => g.colour === c));
  const caratsIn = (colour: string) =>
    carats.filter((c) => golds.some((g) => g.carat === c && g.colour === colour)).join(' / ');
  const gold =
    golds.length === 0
      ? []
      : golds.length === carats.length * colours.length
        ? [`${carats.join(' / ')} ${colours.join(' / ')} Gold`]
        : colours.map((colour) => `${caratsIn(colour)} ${colour} Gold`);
  // The gold phrase sits where the product's first gold does.
  const firstGold = labels.findIndex((l) => GOLD_LABEL.test(l));
  const rest = labels.filter((l) => !GOLD_LABEL.test(l));
  const parts = firstGold < 0 ? rest : [...rest.slice(0, firstGold), ...gold, ...rest.slice(firstGold)];
  const stones = [
    ...new Set(
      (variants ?? []).map((v) => stoneLabel(v.stone?.stoneType)).filter((s): s is string => !!s)
    ),
  ];
  return [...parts, ...stones].join(', ') || undefined;
}

/**
 * What tells a variant apart from the product's others, for a cart line and
 * the order: its material when the product comes in more than one, and its
 * size when it's a stocked size (a made-to-order size travels separately as
 * the customer's own). "14ct Gold", "Size M" or "14ct Gold, size M".
 */
export function variantDetail(
  v: Pick<Variant, 'metalType' | 'customMaterial' | 'size' | 'madeToOrder'>,
  variants: Pick<Variant, 'metalType' | 'customMaterial'>[]
): string | undefined {
  const material = materialsOf(variants).length > 1 ? materialLabel(v) : undefined;
  const size = !v.madeToOrder && v.size ? v.size : undefined;
  if (material && size) return `${material}, size ${size}`;
  return material ?? (size ? `Size ${size}` : undefined);
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
    material: materialsSummary(variants),
    drop: dropLabel(product.collection),
    edition: product.edition,
    size: defaultVariant?.size,
    variantKey: defaultVariant?._key,
    sku: defaultVariant?.sku,
    // Status "Sold Out" wins over stock, as at checkout (which sells Active only).
    inStock:
      product.status === 'active' && !!defaultVariant && variantIsAvailable(defaultVariant),
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
