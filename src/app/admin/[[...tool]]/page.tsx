/**
 * Embedded Sanity Studio, served at /admin.
 * This route runs the full Studio inside the Next.js app — one deploy, one repo.
 * (Moved from /studio so the public brand page can own /studio.)
 */
import { NextStudio } from 'next-sanity/studio';
import config from '../../../../sanity.config';
import '@/sanity/studio.css';

export const dynamic = 'force-static';

export { metadata, viewport } from 'next-sanity/studio';

export default function StudioPage() {
  return <NextStudio config={config} />;
}
