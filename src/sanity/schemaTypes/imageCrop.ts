import type { HotspotOptions } from 'sanity';

/**
 * Crop previews for the Studio's hotspot editor.
 *
 * Sanity's built-in previews are 3:4 / Square / 16:9 / Panorama — none of which
 * is the **2:3 portrait** this site actually renders images at (home galleries,
 * lookbook, exhibitions, product cards). Staff were therefore cropping against
 * frames the storefront never uses. Passing `previews` replaces that default
 * list, so each field advertises the shapes it is really cut to.
 *
 * Note this guides the crop, it does not constrain it: Sanity's crop rectangle
 * stays freeform by design. The preview shows what the site will show.
 */
const RATIO_2_3 = { title: '2:3 (site)', aspectRatio: 2 / 3 };
const RATIO_3_4 = { title: '3:4 (product page)', aspectRatio: 3 / 4 };
const RATIO_5_7 = { title: '5:7 (studio portrait)', aspectRatio: 5 / 7 };
const RATIO_16_9 = { title: '16:9 (wide band)', aspectRatio: 16 / 9 };

/** Images the storefront always renders in a 2:3 portrait frame. */
export const crop2x3: HotspotOptions = { previews: [RATIO_2_3] };

/** The Studio page's portrait, beside the About copy. */
export const crop5x7: HotspotOptions = { previews: [RATIO_5_7] };

/** Full-width landscape bands, e.g. the Studio page flatlay. */
export const crop16x9: HotspotOptions = { previews: [RATIO_16_9] };

/**
 * Product photography, which appears in both frames: 2:3 on the shop grid
 * card, 3:4 in the product-page gallery. Both are shown so a crop can be
 * judged against each.
 */
export const cropProduct: HotspotOptions = { previews: [RATIO_2_3, RATIO_3_4] };
