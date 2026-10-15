import 'server-only';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { sanityFetch } from '@/lib/sanity/fetch';
import type { Announcement, AnnouncementPage } from '@/lib/announcements';

// Not yet ended. Ones that haven't started are sent too, so a cached page
// shows them from their start time without waiting for a rebuild.
const announcementsQuery = `*[_type == "announcement" && show != false && $page in pages
  && (!defined(showUntil) || showUntil > now())] | order(_createdAt asc){
  _id, message, showFrom, showUntil
}`;

/** The published announcements for one page, under its heading rule. */
export default async function Announcements({ page }: { page: AnnouncementPage }) {
  const items = await sanityFetch<Announcement[]>({
    label: `announcements:${page}`,
    query: announcementsQuery,
    params: { page },
    fallback: [],
  });
  if (!items.length) return null;
  return <AnnouncementBanner items={items} renderedAt={Date.now()} />;
}
