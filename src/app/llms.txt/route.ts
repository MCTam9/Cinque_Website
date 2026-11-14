import { sanityClient } from '@/lib/sanity/client';
import { merchantFeedQuery } from '@/lib/sanity/queries';
import { formatGBP, formatLabel, materialLabel } from '@/lib/products';
import { RING_OCCASION_LABELS, absoluteUrl } from '@/lib/seo';
import {
  ENGRAVING_MAX,
  ENGRAVING_PRICE_PENCE,
  MADE_TO_ORDER_LEAD_TIME,
} from '@/lib/shop/madeToOrder';
import {
  IN_STOCK_LEAD_TIME,
  SHIPPING_RATES,
  SHIPPING_REACH,
  EU_PAUSE_NOTICE,
} from '@/lib/shop/shipping';
import type { RingOccasion, Variant } from '@/types';

/**
 * /llms.txt: a plain summary of the studio for AI assistants and answer
 * engines, which may quote it word for word.
 *
 * It used to be a static file in /public and went stale (it listed five
 * shipping countries long after shipping went worldwide). Built here instead,
 * shipping terms, lead times and engraving come from the same constants the
 * checkout uses, and the product list from Sanity, so it can't drift again.
 */

export const revalidate = 3600;

interface LlmsProduct {
  title: string;
  slug: string;
  status: 'active' | 'sold_out';
  ringOccasions?: RingOccasion[];
  variants?: Variant[];
}

const INTRO = `# Cinque

> Cinque® is an independent jewellery and object studio in London, founded by
> Cindy Liu. Pieces are individually made by hand, cast and hallmarked in
> London, and treat jewellery as a form of memory archive. Cinque makes
> bespoke engagement rings and wedding bands, including gimmel rings.

## About

Cinque founder Cindy Liu, with backgrounds in architecture and metalsmithing,
practises jewellery and object making as a form of memory archive. Through wax
and metal forming, Cinque transforms natural and cultural relics into tangible,
wearable pieces. The name Cinque means "five", after the five fingers.

The studio is in London, W2.

- Email: cindy@cinque.studio
- Contact form: ${absoluteUrl('/studio#contact')}
- Instagram: https://www.instagram.com/cinque.made

## What Cinque makes

- Rings, earrings, necklaces and cast metal objects
- Materials: sterling silver, 9ct, 14ct and 18ct gold, platinum, gold vermeil
  and brass; some pieces set with stones such as freshwater pearl
- Pieces are released in numbered drops, in limited editions and one-offs
- Silver and carat-gold pieces are hallmarked in London. Because each piece is
  made by hand, no two are exactly alike.

## Engagement rings and wedding bands

Cinque makes engagement rings and wedding bands, both from its collections
and as bespoke commissions.

The gimmel ring takes its name from the Latin gemellus, "twin": two hoops that
fit together as one. In the 16th and 17th centuries, gimmels were often given
as engagement rings. Some also carried the clasped hands of the fede ring, from
the Italian mani in fede, "hands in faith", a symbol of love and betrothal
since Roman times.

Cinque's Hand & Hand Gimmel Ring is made in this tradition: two interlocking
hoops, joined by clasped hands, that fit together as one. It is made to order
in the buyer's ring size, in sterling silver or yellow gold.

- Made-to-order rings take ${MADE_TO_ORDER_LEAD_TIME}, in any size the buyer enters at checkout.
- Engraving is available on selected made-to-order rings: up to ${ENGRAVING_MAX} characters, ${formatGBP(ENGRAVING_PRICE_PENCE)}.
- Bespoke commissions (other metals, stones or designs) start with an enquiry
  through the contact form or by email. Lead times are confirmed when the
  commission is agreed.
- Ring sizes are UK letter sizes; a ring size chart is on every ring page.`;

const BUYING = `## Buying

- Prices are in GBP. Pieces are bought on the website.
- ${SHIPPING_REACH} ${EU_PAUSE_NOTICE}
- Delivery: ${formatGBP(SHIPPING_RATES.domesticPence)} in the UK, ${formatGBP(SHIPPING_RATES.internationalPence)} internationally, free everywhere on orders of ${formatGBP(SHIPPING_RATES.freeFromPence)} or more.
  Orders are sent tracked and insured.
- In-stock pieces are dispatched within ${IN_STOCK_LEAD_TIME}. Made-to-order
  pieces are dispatched within ${MADE_TO_ORDER_LEAD_TIME}.
- Orders outside the UK may attract import duties and taxes, payable by the
  recipient.
- Returns: under the UK Consumer Contracts Regulations an eligible order may be
  cancelled within 14 days of receipt for a refund. Items must be unworn and in
  original condition and packaging. Made-to-order, bespoke, commissioned,
  personalised or altered pieces are not eligible unless faulty. Return postage
  is the customer's responsibility unless the item is faulty.`;

const PAGES = `## Pages

- ${absoluteUrl('/shop')}: the full catalogue
- ${absoluteUrl('/shop/rings')}, ${absoluteUrl('/shop/earrings')},
  ${absoluteUrl('/shop/necklaces')}, ${absoluteUrl('/shop/objects')}: by category
- ${absoluteUrl('/lookbook')}: drops and the studio archive
- ${absoluteUrl('/press')}: press, shows and installations
- ${absoluteUrl('/studio')}: about the studio, contact, and bespoke commissions
- ${absoluteUrl('/shipping')}: shipping destinations, lead times and returns`;

/** "- [Twist Band](…): Sterling Silver £150; in stock, sizes N, P" */
function productLine(p: LlmsProduct): string | null {
  const variants = (p.variants ?? []).filter((v) => v.priceGBP > 0);
  if (!variants.length) return null;

  const prices = new Map<string, number>();
  for (const v of variants) {
    const material = materialLabel(v) ?? 'Price';
    prices.set(material, Math.min(prices.get(material) ?? Infinity, v.priceGBP));
  }
  const priceText = [...prices]
    .map(([material, pence]) => `${material} ${formatGBP(pence)}`)
    .join(', ');

  const stockedSizes = variants
    .filter((v) => !v.madeToOrder && v.stockQuantity > 0 && v.size && !/^one size$/i.test(v.size))
    .map((v) => v.size);
  const inStock = variants.some((v) => !v.madeToOrder && v.stockQuantity > 0);
  const madeToOrder = variants.some((v) => v.madeToOrder);
  const availability = [
    inStock && (stockedSizes.length ? `in stock in size ${stockedSizes.join(', ')}` : 'in stock'),
    madeToOrder && `made to order in any size (${MADE_TO_ORDER_LEAD_TIME})`,
  ]
    .filter(Boolean)
    .join('; ');

  const occasions = (p.ringOccasions ?? [])
    .filter((o) => o in RING_OCCASION_LABELS)
    .map((o) => RING_OCCASION_LABELS[o].toLowerCase());

  return [
    `- [${formatLabel(p.title)}](${absoluteUrl(`/shop/${p.slug}`)}): ${priceText}`,
    availability,
    occasions.length ? `for: ${occasions.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('; ');
}

export async function GET() {
  let productSection = '';
  try {
    const products = await sanityClient.fetch<LlmsProduct[]>(merchantFeedQuery);
    const lines = products
      .filter((p) => p.status === 'active')
      .map(productLine)
      .filter((l): l is string => Boolean(l));
    if (lines.length) {
      productSection = `## Current pieces\n\nPrices from, in GBP. Updated hourly.\n\n${lines.join('\n')}`;
    }
  } catch (err) {
    // The summary stands on its own; the product list is a bonus.
    console.error('[sanity] llms.txt product list failed, serving without it', err);
  }

  const body = [INTRO, productSection, BUYING, PAGES].filter(Boolean).join('\n\n') + '\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
