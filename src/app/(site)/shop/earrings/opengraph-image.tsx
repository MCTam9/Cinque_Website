import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Cinque earrings';

export default function Image() {
  return ogImage({ title: 'Earrings', subtitle: 'Sculptural forms, cast in small editions' });
}
