'use client';

import { useEffect, useState } from 'react';
import { P1 } from '@/components/typography';
import { CHRISTMAS_CUTOFF } from '@/lib/shop/madeToOrder';

const MESSAGE =
  'Made-to-order pieces take 8 to 12 weeks to craft. Please place festive orders by 20 October for Christmas delivery.';

const live = () => Date.now() <= CHRISTMAS_CUTOFF.getTime();

/**
 * The Christmas cut-off notice under the SHOP and CART headings: a white box
 * hanging off the heading's rule, so its top edge is that rule (no top border
 * of its own) and it spans the same width. Gone once the cut-off passes,
 * checked again in the browser so a page cached before the date doesn't keep
 * quoting it.
 */
export default function AnnouncementBanner() {
  const [show, setShow] = useState(live);
  useEffect(() => setShow(live()), []);
  if (!show) return null;
  return (
    <div className="border-x border-b border-oslo bg-white px-[10px] py-[8px]">
      <P1 className="text-graphite">{MESSAGE}</P1>
    </div>
  );
}
