import type { MetalType } from '@/types';
import { SHOP_CATEGORIES } from '@/lib/shop/categories';

/**
 * The Shop's material groups — how the catalog is laid out and what the
 * sidebar lists. Gold comes first, then silver, then everything else.
 *
 * Kept dependency-free like categories.ts. A piece's group comes from its
 * default variant — the same variant whose material its card shows — so a
 * card never sits under a heading that contradicts its own Material row.
 */
export const MATERIAL_GROUPS = [
  { value: 'gold', label: 'Gold', metals: ['9ct_gold', '18ct_gold'] },
  { value: 'silver', label: 'Silver', metals: ['sterling_silver'] },
  // Gold vermeil, platinum, brass and mixed ("custom") materials.
  { value: 'other', label: 'Other', metals: [] },
] as const satisfies readonly {
  value: string;
  label: string;
  metals: readonly MetalType[];
}[];

export type MaterialGroup = (typeof MATERIAL_GROUPS)[number]['value'];

/** The group a metal belongs to; anything unlisted (or missing) is "other". */
export function materialGroupOf(metal?: MetalType): MaterialGroup {
  const found = MATERIAL_GROUPS.find((g) =>
    (g.metals as readonly MetalType[]).includes(metal as MetalType)
  );
  return found?.value ?? 'other';
}

/**
 * Catalog order: by material group (gold first), then by category in sidebar
 * order, then A–Z by title. Anything without a known category goes last
 * within its group. `groupOf` says which group an item is in.
 */
export function sortByMaterialThenCategory<T extends { category?: string; title: string }>(
  items: T[],
  groupOf: (item: T) => MaterialGroup
): T[] {
  const groupRank = (g: MaterialGroup) => MATERIAL_GROUPS.findIndex((m) => m.value === g);
  const categoryRank = (c?: string) => {
    const i = SHOP_CATEGORIES.findIndex((cat) => cat.value === c);
    return i === -1 ? SHOP_CATEGORIES.length : i;
  };
  return [...items].sort(
    (a, b) =>
      groupRank(groupOf(a)) - groupRank(groupOf(b)) ||
      categoryRank(a.category) - categoryRank(b.category) ||
      a.title.localeCompare(b.title, 'en-GB', { sensitivity: 'base' })
  );
}
