import 'server-only';
import { sanityWriteClient } from '@/lib/sanity/writeClient';

export interface ReconciledVariant {
  sku?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
}

export interface ReconciledProduct {
  _id: string;
  title: string;
  status: string;
  variants?: ReconciledVariant[];
}

const RECONCILE_QUERY = `*[_id == $id][0]{
  _id, title, status,
  variants[]{ sku, stockQuantity, lowStockThreshold, allowBackorder }
}`;

/**
 * Keep `product.status` honest with stock levels — so staff never have to
 * manually toggle "sold out".
 *
 * Rules (deliberately conservative — only ever moves between 'active' and
 * 'sold_out'; it NEVER touches 'draft' or 'archived', which are human choices):
 *  - no variant available (all zero stock, none backorderable) & currently
 *    'active'  → set 'sold_out'
 *  - some stock available & currently 'sold_out' → set 'active' (auto-restock)
 *
 * Returns the freshly-fetched product docs so callers can also compute
 * low-stock alerts without a second round-trip.
 */
export async function reconcileProductStatus(
  productIds: string[]
): Promise<ReconciledProduct[]> {
  const unique = [...new Set(productIds.filter(Boolean))];
  const docs: ReconciledProduct[] = [];

  for (const id of unique) {
    const doc = (await sanityWriteClient.fetch(RECONCILE_QUERY, { id })) as
      | ReconciledProduct
      | null;
    if (!doc) continue;
    docs.push(doc);

    const anyAvailable = (doc.variants ?? []).some(
      (v) => (v.allowBackorder ?? false) || (v.stockQuantity ?? 0) > 0
    );

    let next: string | null = null;
    if (!anyAvailable && doc.status === 'active') next = 'sold_out';
    else if (anyAvailable && doc.status === 'sold_out') next = 'active';

    if (next) {
      await sanityWriteClient.patch(id).set({ status: next }).commit();
      doc.status = next;
    }
  }

  return docs;
}

export interface LowStockItem {
  productTitle: string;
  sku: string;
  remaining: number;
  threshold: number;
}

/** Flatten reconciled products into the variants that are at/below threshold. */
export function collectLowStock(docs: ReconciledProduct[]): LowStockItem[] {
  const items: LowStockItem[] = [];
  for (const doc of docs) {
    for (const v of doc.variants ?? []) {
      if (v.allowBackorder) continue;
      const threshold = v.lowStockThreshold ?? 0;
      const remaining = v.stockQuantity ?? 0;
      if (remaining <= threshold) {
        items.push({
          productTitle: doc.title,
          sku: v.sku ?? 'unknown',
          remaining,
          threshold,
        });
      }
    }
  }
  return items;
}
