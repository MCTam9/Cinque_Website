import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Cinque objects';

export default function Image() {
  return ogImage({ title: 'Objects', subtitle: 'Cast metal works from the studio archive' });
}
