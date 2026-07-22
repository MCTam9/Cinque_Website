/**
 * Shared application types. These mirror the Sanity schemas closely enough to
 * type the storefront and API boundary. (For fully generated types, add
 * `sanity typegen` later — this hand-written set keeps the scaffold moving.)
 */

export type MetalType =
  | '9ct_gold'
  | '18ct_gold'
  | 'sterling_silver'
  | 'platinum'
  | 'gold_vermeil'
  | 'brass';

export interface StoneSpec {
  stoneType?: string;
  carat?: number;
  dimensionsMm?: { length?: number; width?: number; depth?: number };
  cut?: string;
  settingType?: string;
  count?: number;
}

export interface Variant {
  _key: string;
  sku: string;
  metalType: MetalType;
  metalFinish?: string;
  size?: string;
  stone?: StoneSpec;
  priceGBP: number; // pence
  stripePriceId?: string;
  weightGrams?: number;
  stockQuantity: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
}

export interface Product {
  _id: string;
  title: string;
  slug: string;
  status: 'draft' | 'active' | 'sold_out' | 'archived';
  images?: Array<{ alt?: string; asset?: unknown }>;
  variants: Variant[];
}

/** A line in the client-side cart (Zustand). */
export interface CartLine {
  productId: string;
  variantKey: string;
  sku: string;
  title: string;
  unitPriceGBP: number; // pence, display-only; re-validated server-side
  quantity: number;
  imageUrl?: string;
}

/** Payload the client posts to POST /api/checkout. */
export interface CheckoutRequestLine {
  productId: string;
  variantKey: string;
  quantity: number;
}

/** Compact per-line data stashed in Stripe session metadata for fulfillment. */
export interface FulfillmentLine {
  p: string; // productId
  v: string; // variantKey
  q: number; // quantity
}
