import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Cinque lookbook';

export default function Image() {
  return ogImage({ title: 'Lookbook', subtitle: 'Drops and the studio archive' });
}
