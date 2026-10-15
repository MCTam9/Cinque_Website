import type { PortableTextBlock } from '@portabletext/types';

/**
 * Announcements: short notices edited in the Admin (Announcements), each
 * shown on the pages ticked there, in a white box hanging off the page
 * heading's rule. Shared by the Admin schema, the server fetch and the banner.
 */

export const ANNOUNCEMENT_PAGES = [
  { title: 'Shop (all products, categories)', value: 'shop' },
  { title: 'Product pages', value: 'product' },
  { title: 'Cart', value: 'cart' },
  { title: 'Checkout', value: 'checkout' },
  { title: 'Lookbook', value: 'lookbook' },
  { title: 'Press', value: 'press' },
  { title: 'Studio', value: 'studio' },
] as const;

export type AnnouncementPage = (typeof ANNOUNCEMENT_PAGES)[number]['value'];

export interface Announcement {
  _id: string;
  /** Rich text (bold, italic, underline, links); plain text before styles existed. */
  message: PortableTextBlock[] | string;
  showFrom?: string | null;
  showUntil?: string | null;
}

/** The message as plain text, for the Admin's list and the length limit. */
export const messageText = (message: Announcement['message'] | undefined): string =>
  typeof message === 'string'
    ? message
    : (message ?? [])
        .map((b) =>
          ((b.children as { text?: string }[] | undefined) ?? []).map((c) => c.text ?? '').join('')
        )
        .join('\n');

/** Whether an announcement is within its dates at time `t` (ms). */
export const isLiveAt = (a: Announcement, t: number) =>
  (!a.showFrom || Date.parse(a.showFrom) <= t) && (!a.showUntil || Date.parse(a.showUntil) > t);
