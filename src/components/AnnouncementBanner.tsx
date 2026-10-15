'use client';

import { useEffect, useState } from 'react';
import { PortableText, type PortableTextComponents } from '@portabletext/react';
import { P1 } from '@/components/typography';
import { components as richText } from '@/components/PortableText';
import { isLiveAt, type Announcement } from '@/lib/announcements';

// Paragraphs in the banner's grey; bold, italic, underline and links as usual.
const components: PortableTextComponents = {
  ...richText,
  block: { normal: ({ children }) => <P1 className="text-oslo">{children}</P1> },
};

/**
 * Announcements from the Admin under a page heading: a white box hanging off
 * the heading's rule, so its top edge is that rule (no top border of its own)
 * and it spans the same width. Several stack as one box divided by lines.
 *
 * Start and end times are checked again in the browser, so a page cached
 * before either still shows the right ones. The first render uses the
 * server's clock (`renderedAt`) so it matches the HTML.
 */
export default function AnnouncementBanner({
  items,
  renderedAt,
}: {
  items: Announcement[];
  renderedAt: number;
}) {
  const [now, setNow] = useState(renderedAt);
  useEffect(() => setNow(Date.now()), []);
  const live = items.filter((a) => isLiveAt(a, now));
  if (!live.length) return null;
  return (
    <div className="flex flex-col">
      {live.map((a) => (
        <div key={a._id} className="border-x border-b border-oslo bg-white px-[10px] py-[8px]">
          {typeof a.message === 'string' ? (
            <P1 className="whitespace-pre-line text-oslo">{a.message}</P1>
          ) : (
            <PortableText value={a.message} components={components} />
          )}
        </div>
      ))}
    </div>
  );
}
